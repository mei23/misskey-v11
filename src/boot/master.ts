import * as os from 'os';
import * as cluster from 'cluster';
import * as chalk from 'chalk';
import * as portscanner from 'portscanner';

import Logger from '../services/logger';
import loadConfig from '../config/load';
import { Config } from '../config/types';
import { envOption } from '../env';
import { showMachineInfo } from '../misc/show-machine-info';
import { initDb } from '../db/postgre';
import * as meta from '../meta.json';

const logger = new Logger('core', 'cyan');
const bootLogger = logger.createSubLogger('boot', 'magenta', false);

function greet() {
	if (!envOption.quiet) {
		//#region Misskey logo
		const v = `v${meta.version}`;
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
	bootLogger.info(`Misskey v${meta.version}`, null, true);
}

/**
 * Init master process
 */
export async function masterMain() {
	let config!: Config;

	try {
		greet();

		// initialize app
		config = await init();

		if (config.port == null || Number.isNaN(config.port)) {
			bootLogger.error('The port is not configured. Please configure port.', null, true);
			process.exit(1);
		}

		if (!await isPortAvailable(config.port)) {
			bootLogger.error(`Port ${config.port} is already in use`, null, true);
			process.exit(1);
		}
	} catch (e) {
		bootLogger.error('Fatal error occurred during initialization', null, true);
		process.exit(1);
	}

	bootLogger.succ('Misskey initialized');

	if (!envOption.disableClustering) {
		await spawnWorkers(config.clusterLimit);
	}

	if (!envOption.noDaemons) {
		require('../daemons/server-stats').default();
		require('../daemons/notes-stats').default();
		require('../daemons/queue-stats').default();
		require('../daemons/janitor').default();
	}

	bootLogger.succ(`Now listening on port ${config.port} on ${config.url}`, null, true);
}

const runningNodejsVersion = process.version.slice(1).split('.').map(x => parseInt(x, 10));

async function isPortAvailable(port: number): Promise<boolean> {
	return await portscanner.checkPortStatus(port, '127.0.0.1') === 'closed';
}

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

	// Try to connect to DB
	try {
		bootLogger.info('Connecting database...');
		await initDb();
	} catch (e) {
		bootLogger.error('Cannot connect to database', null, true);
		bootLogger.error(e);
		process.exit(1);
	}

	return config;
}

async function spawnWorkers(limit: number = 1) {
	const workers = Math.min(limit, os.cpus().length);
	bootLogger.info(`Starting ${workers} worker${workers === 1 ? '' : 's'}...`);
	await Promise.all([...Array(workers)].map(spawnWorker));
	bootLogger.succ('All workers started');
}

function spawnWorker(): Promise<void> {
	return new Promise(res => {
		const worker = cluster.fork();
		worker.on('message', message => {
			if (message !== 'ready') return;
			res();
		});
	});
}
