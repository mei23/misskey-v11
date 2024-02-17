import config from '../../config';
import { getResponse } from '../../misc/fetch';
import { createSignedPost, createSignedGet } from './ap-request';
import { ILocalUser } from '../../models/entities/user';
import { UserKeypairs } from '../../models';
import { ensure } from '../../prelude/ensure';
import type { Response } from 'got';

export default async (user: ILocalUser, url: string, object: any, digest?: string) => {
	const body = typeof object === 'string' ? object : JSON.stringify(object);

	const keypair = await UserKeypairs.findOne({
		userId: user.id
	}).then(ensure);

	const req = createSignedPost({
		key: {
			privateKeyPem: keypair.privateKey,
			keyId: `${config.url}/users/${user.id}#main-key`
		},
		url,
		body,
		digest,
		additionalHeaders: {
			'User-Agent': config.userAgent,
		}
	});

	const res = await getResponse({
		url,
		method: req.request.method,
		headers: req.request.headers,
		body,
		timeout: 10 * 1000,
	});

	return `${res.statusCode} ${res.statusMessage} ${res.body}`;
};

/**
 * Get AP object
 * @param user http-signature user
 * @param url URL to fetch
 */
export async function apGet(url: string, user?: ILocalUser) {
	let res: Response<string>;

	if (user) {
		const keypair = await UserKeypairs.findOne({
			userId: user.id
		}).then(ensure);

		const req = createSignedGet({
			key: {
				privateKeyPem: keypair.privateKey,
				keyId: `${config.url}/users/${user.id}#main-key`
			},
			url,
			additionalHeaders: {
				'User-Agent': config.userAgent,
			}
		});

		res = await getResponse({
			url,
			method: req.request.method,
			headers: req.request.headers
		});
	} else {
		res = await getResponse({
			url,
			method: 'GET',
			headers: {
				'Accept': 'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
				'User-Agent': config.userAgent,
			},
		});
	}

	if (validateContentType(res.headers['content-type']) !== true) {
		throw new Error('Invalid Content Type');
	}

	if (res.body.length > 65536) throw new Error('too large JSON');

	return await JSON.parse(res.body);
}

function validateContentType(contentType: string | null | undefined): boolean {
	if (contentType == null) return false;

	const parts = contentType.split(/\s*;\s*/);
	if (parts[0] === 'application/activity+json') return true;
	if (parts[0] !== 'application/ld+json') return false;
	return parts.slice(1).some(part => part.trim() === 'profile="https://www.w3.org/ns/activitystreams"');
}
