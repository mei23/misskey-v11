import * as childProcess from 'child_process';
import fetch from 'node-fetch';
import * as http from 'http';
import loadConfig from '../src/config/load';
import { SIGKILL } from 'constants';
import { createConnection, getConnection } from 'typeorm';
import { entities } from '../src/db/postgre';

const config = loadConfig();
export const port = config.port;

export const async = (fn: Function) => (done: Function) => {
	fn().then(() => {
		done();
	}, (err: Error) => {
		done(err);
	});
};

export function launchServer(callbackSpawnedProcess: (p: childProcess.ChildProcess) => void, moreProcess: () => Promise<void> = async () => {}) {
	return (done: (err?: Error) => any) => {
		const p = childProcess.spawn('node', [__dirname + '/../index.js'], {
			stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
			env: { NODE_ENV: 'test', PATH: process.env.PATH }
		});
		callbackSpawnedProcess(p);
		p.on('message', message => {
			if (message === 'ok') moreProcess().then(() => done()).catch(e => done(e));
		});
	};
}

export async function initTestDb(justBorrow = false, initEntities?: any[]) {
	if (process.env.NODE_ENV !== 'test') throw 'NODE_ENV is not a test';

	try {
		const conn = await getConnection();
		await conn.close();
	} catch (e) {}

	return await createConnection({
		type: 'postgres',
		host: config.db.host,
		port: config.db.port,
		username: config.db.user,
		password: config.db.pass,
		database: config.db.db,
		synchronize: true && !justBorrow,
		dropSchema: true && !justBorrow,
		entities: initEntities || entities
	});
}

export function startServer(timeout = 30 * 1000): Promise<childProcess.ChildProcess> {
	return new Promise((res, rej) => {
		const t = setTimeout(() => {
			p.kill(SIGKILL);
			rej('timeout to start');
		}, timeout);

		const p = childProcess.spawn('node', [__dirname + '/../index.js'], {
			stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
			env: { NODE_ENV: 'test', PATH: process.env.PATH }
		});

		p.on('error', e => rej(e));

		p.on('message', message => {
			if (message === 'ok') {
				clearTimeout(t);
				res(p);
			}
		});
	});
}

export function shutdownServer(p: childProcess.ChildProcess, timeout = 20 * 1000) {
	return new Promise((res, rej) => {
		const t = setTimeout(() => {
			p.kill(SIGKILL);
			res('force exit');
		}, timeout);

		p.once('exit', () => {
			clearTimeout(t);
			res('exited');
		});

		p.kill();
	});
}

export const api = async (endpoint: string, params: any, me?: any): Promise<{ body: any, status: number }> => {
	const auth = me ? {
		i: me.token
	} : {};

	const res = await fetch(`http://localhost:${port}/api/${endpoint}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(Object.assign(auth, params))
	});

	const status = res.status;
	const body = res.status !== 204 ? await res.json().catch() : null;

	return {
		status,
		body
	};
};

export const signup = async (params?: any): Promise<any> => {
	const q = Object.assign({
		username: 'test',
		password: 'test'
	}, params);

	const res = await api('signup', q);

	return res.body;
};

export const post = async (user: any, params?: any): Promise<any> => {
	const q = Object.assign({
		text: 'test'
	}, params);

	const res = await api('notes/create', q, user);

	return res.body ? res.body.createdNote : null;
};

export const simpleGet = async (path: string, accept = '*/*'): Promise<{ status?: number, type?: string, location?: string }> => {
	// node-fetchだと3xxを取れない
	return await new Promise((resolve, reject) => {
		const req = http.request(`http://localhost:${port}${path}`, {
			headers: {
				Accept: accept
			}
		}, res => {
			if (res.statusCode! >= 400) {
				reject(res);
			} else {
				resolve({
					status: res.statusCode,
					type: res.headers['content-type'],
					location: res.headers.location,
				});
			}
		});

		req.end();
	});
};
