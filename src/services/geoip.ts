import { httpAgent, httpsAgent } from '../misc/fetch';
import Logger from './logger';
import config from '../config';
import fetch from 'node-fetch';
export const logger = new Logger('instanceinfo', 'cyan');

let nextResetTime = 0;

/**
 * IP to CC
 */
export async function geoIpLookup(ip: string): Promise<string> {
	// 抑制中？
	if (Date.now() < nextResetTime) {
		throw `suspended until ${nextResetTime}`;
	}

	if (ip == null) throw 'invalid ip';
	const url = `http://ip-api.com/json/${ip}`;

	const res = await fetch(url, {
		headers: {
			'User-Agent': config.userAgent,
		},
		timeout: 10 * 1000,
		agent: u => u.protocol == 'http:' ? httpAgent : httpsAgent,
	});

	if (!res.ok) {
		// レートリミット時
		if (res.status === 429) {
			const ttl = Number(res.headers.get('x-ttl'));
			nextResetTime = Date.now() + (ttl * 1000);
			throw `got ratelimit until ${nextResetTime}`;
		}

		throw `${res.status} ${res.statusText}`;
	}

	// 残りリクエストのチェック
	const r1 = Number(res.headers.get('x-r1'));
	const ttl = Number(res.headers.get('x-ttl'));
	if (r1 === 0) {
		nextResetTime = Date.now() + (ttl * 1000);
	}

	let json;
	try {
		json = await res.json();
	} catch (e) {
		throw `JsonParseError`;
	}

	if (json.status !== 'success') {
		throw json.message;
	}
	return json.countryCode;
}
