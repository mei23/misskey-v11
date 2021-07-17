import * as http from 'http';
import * as websocket from 'websocket';
import * as redis from 'redis';

import MainStreamConnection from './stream';
import { ParsedUrlQuery } from 'querystring';
import authenticate from './authenticate';
import { EventEmitter } from 'events';
import config from '../../config';

module.exports = (server: http.Server) => {
	// Init websocket server
	const ws = new websocket.server({
		httpServer: server
	});

	ws.on('request', async (request) => {
		const q = request.resourceURL.query as ParsedUrlQuery;
		const [user, app] = await authenticate(q.i as string);

		if (user?.isSuspended) {
			request.reject(400);
			return;
		}

		const connection = request.accept();

		let ev: EventEmitter;

		// Connect to Redis
		const subscriber = redis.createClient(
			config.redis.port,
			config.redis.host,
			{
				password: config.redis.pass
			}
		);

		subscriber.subscribe(config.host);

		ev = new EventEmitter();

		subscriber.on('message', async (_, data) => {
			const obj = JSON.parse(data);

			ev.emit(obj.channel, obj.message);
		});

		connection.once('close', () => {
			subscriber.unsubscribe();
			subscriber.quit();
		});

		const main = new MainStreamConnection(connection, ev, user, app);

		connection.once('close', () => {
			ev.removeAllListeners();
			main.dispose();
		});

		connection.on('message', async (data) => {
			if (data.utf8Data == 'ping') {
				connection.send('pong');
			}
		});
	});
};
