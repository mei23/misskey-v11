/**
 * Misskey Entry Point!
 */

Error.stackTraceLimit = Infinity;

require('events').EventEmitter.defaultMaxListeners = 128;

import * as os from 'os';
import * as cluster from 'cluster';
import * as chalk from 'chalk';
import Xev from 'xev';

import Logger from './services/logger';
import serverStats from './daemons/server-stats';
import queueStats from './daemons/queue-stats';
import loadConfig from './config/load';
import { Config } from './config/types';
import { lessThan } from './prelude/array';
import { program } from './argv';
import { checkMongoDB } from './misc/check-mongodb';
import { showMachineInfo } from './misc/show-machine-info';

const logger = new Logger('core', 'cyan');
const bootLogger = logger.createSubLogger('boot', 'magenta', false);
const clusterLogger = logger.createSubLogger('cluster', 'orange');
const ev = new Xev();
const workerIndex: Record<number, string> = {};

/**
 * Init process
 */
function main() {
	process.title = `Misskey (${cluster.isMaster ? 'master'
		: process.env.WORKER_TYPE === 'server' ? 'server'
		: process.env.WORKER_TYPE === 'queue' ? 'queue'
		: 'worker'})`;

	if (program.onlyQueue) {
		queueMain();
		return;
	}

	if (cluster.isMaster || program.disableClustering) {
		masterMain();

		if (cluster.isMaster) {
			ev.mount();
		}

		if (program.daemons) {
			serverStats();
			queueStats();
		}
	}

	if (cluster.isWorker || program.disableClustering) {
		workerMain();
	}
}

function greet(config: Config) {
	if (!program.quiet) {
		//#region Misskey logo
		const v = `v${config.version}`;
		console.log('  _____ _         _           ');
		console.log(' |     |_|___ ___| |_ ___ _ _ ');
		console.log(' | | | | |_ -|_ -| \'_| -_| | |');
		console.log(' |_|_|_|_|___|___|_,_|___|_  |');
		console.log(' ' + chalk.gray(v) + ('                        |___|\n'.substr(v.length)));
		//#endregion

		console.log(' Misskey is maintained by @syuilo, @AyaMorisawa, @mei23, @acid-chicken, and @rinsuki.');
		console.log(chalk.keyword('orange')(' If you like Misskey, please donate to support development. https://www.patreon.com/syuilo'));

		console.log('');
		console.log(chalk`< ${os.hostname()} {gray (PID: ${process.pid.toString()})} >`);
	}

	bootLogger.info('Welcome to Misskey!');
	bootLogger.info(`Misskey v${config.version}`, null, true);
}

/**
 * Init master process
 */
async function masterMain() {
	let config: Config;

	try {
		// initialize app
		config = await init();

		greet(config);

		if (config.port == null) {
			bootLogger.error('The port is not configured. Please configure port.', null, true);
			process.exit(1);
		}
	} catch (e) {
		bootLogger.error('Fatal error occurred during initialization', null, true);
		process.exit(1);
	}

	bootLogger.succ('Misskey initialized');

	if (!program.disableClustering) {
		await spawnWorkers(config);
	}

	bootLogger.succ(`Now listening on port ${config.port} on ${config.url}`, null, true);
}

/**
 * Init worker process
 */
async function workerMain() {
	const workerType = process.env.WORKER_TYPE;

	if (workerType === 'server') {
		await require('./server').default();
	} else if (workerType === 'queue') {
		require('./queue').default();
	} else {
		await require('./server').default();
		require('./queue').default();
	}

	if (cluster.isWorker) {
		// Send a 'ready' message to parent process
		process.send('ready');
	}
}

async function queueMain() {
	try {
		// initialize app
		const config = await init();

		greet(config);
	} catch (e) {
		bootLogger.error('Fatal error occurred during initialization', null, true);
		process.exit(1);
	}

	bootLogger.succ('Misskey initialized');

	// start processor
	require('./queue').default();

	bootLogger.succ('Queue started', null, true);
}

const runningNodejsVersion = process.version.slice(1).split('.').map(x => parseInt(x, 10));
const requiredNodejsVersion = [10, 0, 0];
const satisfyNodejsVersion = !lessThan(runningNodejsVersion, requiredNodejsVersion);

function showEnvironment(): void {
	const env = process.env.NODE_ENV;
	const logger = bootLogger.createSubLogger('env');
	logger.info(typeof env == 'undefined' ? 'NODE_ENV is not set' : `NODE_ENV: ${env}`);

	if (env !== 'production') {
		logger.warn('The environment is not in production mode.');
		logger.warn('DO NOT USE FOR PRODUCTION PURPOSE!', null, true);
	}
}

/**
 * Init app
 */
async function init(): Promise<Config> {
	showEnvironment();

	const nodejsLogger = bootLogger.createSubLogger('nodejs');

	nodejsLogger.info(`Version ${runningNodejsVersion.join('.')}`);

	if (!satisfyNodejsVersion) {
		nodejsLogger.error(`Node.js version is less than ${requiredNodejsVersion.join('.')}. Please upgrade it.`, null, true);
		process.exit(1);
	}

	await showMachineInfo(bootLogger);

	const configLogger = bootLogger.createSubLogger('config');
	let config;

	try {
		config = loadConfig();
	} catch (exception) {
		if (typeof exception === 'string') {
			configLogger.error(exception);
			process.exit(1);
		}
		if (exception.code === 'ENOENT') {
			configLogger.error('Configuration file not found', null, true);
			process.exit(1);
		}
		throw exception;
	}

	configLogger.succ('Loaded');

	// Try to connect to MongoDB
	try {
		await checkMongoDB(config, bootLogger);
	} catch (e) {
		bootLogger.error('Cannot connect to database', null, true);
		process.exit(1);
	}

	return config;
}

async function spawnWorkers(config: Config) {
	if (config.workerStrategies) {
		const servers = config.workerStrategies.serverWorkerCount;
		const queues = config.workerStrategies.queueWorkerCount;

		bootLogger.info(`Starting ${servers} server workers`);
		const serverWorkers = await Promise.all([...Array(servers)].map(() => spawnWorker('server')));
		for (const worker of serverWorkers) workerIndex[worker.id] = 'server';

		bootLogger.info(`Starting ${queues} queue workers`);
		const queueWorkers = await Promise.all([...Array(queues)].map(() => spawnWorker('queue')));
		for (const worker of queueWorkers) workerIndex[worker.id] = 'queue';

		bootLogger.succ('All workers started');
	} else {
		const limit = config.clusterLimit || 1;
		const workers = Math.min(limit, os.cpus().length);
		bootLogger.info(`Starting ${workers} workers...`);
		await Promise.all([...Array(workers)].map(spawnWorker));
		bootLogger.succ('All workers started');
	}
}

function spawnWorker(type: 'server' | 'queue' | 'worker' = 'worker'): Promise<cluster.Worker> {
	return new Promise((res, rej) => {
		const worker = cluster.fork({ WORKER_TYPE: type });
		worker.on('message', message => {
			if (message !== 'ready') return rej();
			res(worker);
		});
	});
}

//#region Events

// Listen new workers
cluster.on('fork', worker => {
	clusterLogger.debug(`Process forked: [${worker.id}]`);
});

// Listen online workers
cluster.on('online', worker => {
	clusterLogger.debug(`Process is now online: [${worker.id}]`);
});

// Listen for dying workers
cluster.on('exit', worker => {
	// Replace the dead worker,
	// we're not sentimental
	clusterLogger.error(chalk.red(`[${worker.id}] died :(`));
	const type = workerIndex[worker.id] || 'worker';
	const w = cluster.fork({ WORKER_TYPE: type });
	workerIndex[w.id] = type;
});

// Display detail of unhandled promise rejection
if (!program.quiet) {
	process.on('unhandledRejection', console.dir);
}

// Display detail of uncaught exception
process.on('uncaughtException', err => {
	logger.error(err);
});

// Dying away...
process.on('exit', code => {
	logger.info(`The process is going to exit with code ${code}`);
});

//#endregion

main();
