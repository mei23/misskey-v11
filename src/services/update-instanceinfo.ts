import * as request from 'request-promise-native';
import config from '../config';
import Instance, { IInstance } from '../models/instance';
import { toApHost } from '../misc/convert-host';
import Logger from './logger';

export const logger = new Logger('instanceinfo', 'cyan');

type Nodeinfo = {
	version: '1.0' | '1.1' | '2.0' | '2.1';
	software: {
		name: string;
		version: string;
	};
	protocols: any;	// 1.0 <=> 2.0 で差があるけど使わないので省略
	services: any;	// 1.0 <=> 2.0 で差があるけど使わないので省略
	openRegistrations: boolean;
	usage: {
		users: {
			total?: number;
			activeHalfyear?: number;
			activeMonth?: number;
		};
		localPosts?: number;
		localComments?: number;
	};
	metadata: {
		name?: string;
		nodeName?: string;
		description?: string;
		nodeDescription?: string;
		maintainer?: {
			name?: string;
			email?: string;
		};
	};
};

export async function UpdateInstanceinfo(instance: IInstance) {
	const _instance = await Instance.findOne({ host: instance.host });
	if (!_instance) throw 'Instance is not registed';

	const now = Date.now();
	if (_instance.infoUpdatedAt && (now - _instance.infoUpdatedAt.getTime() < 1000 * 60 * 60 * 24)) {
		return;
	}

	await Instance.update({ _id: instance._id }, {
		$set: {
			infoUpdatedAt: new Date(),
		}
	});

	logger.info(`Fetching nodeinfo of ${instance.host} ...`);
	const info = await fetchInstanceinfo(toApHost(instance.host));
	logger.info(JSON.stringify(info, null, 2));

	await Instance.update({ _id: instance._id }, {
		$set: {
			infoUpdatedAt: new Date(),
			softwareName: info.softwareName,
			softwareVersion: info.softwareVersion,
			openRegistrations: info.openRegistrations,
			name: info.name,
			description: info.description,
			maintainerName: info.maintainerName,
			maintainerEmail: info.maintainerEmail
		}
	});
}

export async function fetchInstanceinfo(host: string) {
	const info = await fetchNodeinfo(host);

	// additional metadatas
	let name = info.metadata ? (info.metadata.nodeName || info.metadata.name || null) : null;
	let description = info.metadata ? (info.metadata.nodeDescription || info.metadata.description || null) : null;
	const maintainerName = info.metadata ? info.metadata.maintainer ? (info.metadata.maintainer.name || null) : null : null;
	let maintainerEmail = info.metadata ? info.metadata.maintainer ? (info.metadata.maintainer.email || null) : null : null;

	// fetch Mastodon API
	if (!name && info.software.name === 'mastodon') {
		const mastodon = await fetchMastodonInstance(toApHost(host)).catch(() => {});
		if (mastodon) {
			name = mastodon.title;
			description = mastodon.description;
			maintainerEmail = mastodon.email;
		}
	}

	return {
		softwareName: info.software.name,
		softwareVersion: info.software.version,
		openRegistrations: info.openRegistrations,
		name,
		description,
		maintainerName,
		maintainerEmail,
	};
}

export async function fetchNodeinfo(host: string) {
	const wellKnownUrl = `https://${host}/.well-known/nodeinfo`;
	const wellKnown = (await fetchJson(wellKnownUrl)) as {
		links: {
			rel: string;
			href: string;
		}[]
	};

	const links = ['1.0', '1.1', '2.0', '2.1']
		.map(v => wellKnown.links.find(link => link.rel === `http://nodeinfo.diaspora.software/ns/schema/${v}`))
		.filter(x => x != null);

	const link = links[0];

	if (!link) throw 'supported nodeinfo is not found';

	const nodeinfo = (await fetchJson(link.href)) as Nodeinfo;

	return nodeinfo;
}

async function fetchMastodonInstance(host: string) {
	const json = (await fetchJson(`https://${host}/api/v1/instance`)) as {
		title: string;
		short_description: string;
		description: string;
		email: string;
	};

	return json;
}

async function fetchJson(url: string) {
	const json = await request({
		url,
		proxy: config.proxy,
		timeout: 1000 * 10,
		forever: true,
		headers: {
			'User-Agent': config.userAgent,
			Accept: 'application/json, */*'
		},
		json: true
	}).catch(e => {
		throw e.statusCode || e.message;
	});

	return json;
}
