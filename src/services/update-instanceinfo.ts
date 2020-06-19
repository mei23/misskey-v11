import { getJson } from '../misc/fetch';
import Instance, { IInstance } from '../models/instance';
import { toApHost } from '../misc/convert-host';
import Logger from './logger';
import { InboxRequestData } from '../queue';
import { geoIpLookup } from './geoip';

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

export async function UpdateInstanceinfo(instance: IInstance, request?: InboxRequestData) {
	const _instance = await Instance.findOne({ host: instance.host });
	if (!_instance) throw 'Instance is not registed';

	const updateNeeded = () => {
		if (!_instance.infoUpdatedAt) return true;

		const now = Date.now();
		if (now - _instance.infoUpdatedAt.getTime() > 1000 * 60 * 60 * 24) return true;

		if (request?.ip && !_instance.isp && (now - _instance.infoUpdatedAt.getTime() > 1000 * 60 * 60 * 1)) return true;

		return false;
	};

	if (!updateNeeded()) return;

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

	// GeoIP
	const geoip = request?.ip ? await geoIpLookup(request.ip).catch(e => {
		logger.warn(`GeoIP failed for ${toApHost(instance.host!)} ${request.ip} ${e}`);
		return { cc: '??', isp: '??', org: '??', as: '??' };
	}) : null;
	if (geoip) {
		logger.info(`GeoIP: ${toApHost(instance.host!)} ${request?.ip} => ${JSON.stringify(geoip)}`);
		await Instance.update({ _id: instance._id }, {
			$set: {
				infoUpdatedAt: new Date(),
				cc: geoip.cc,
				isp: geoip.isp,
				org: geoip.org,
				as: geoip.as,
			}
		});
	}
}

export async function fetchInstanceinfo(host: string) {
	const info = await fetchNodeinfo(host).catch(() => null);

	if (!info) {
		const mastodon = await fetchMastodonInstance(host);
		return {
			softwareName: 'mastodon',
			softwareVersion: mastodon.version,
		};
	}

	// additional metadatas
	const name = info.metadata ? (info.metadata.nodeName || info.metadata.name || null) : null;
	const description = info.metadata ? (info.metadata.nodeDescription || info.metadata.description || null) : null;
	const maintainerName = info.metadata ? info.metadata.maintainer ? (info.metadata.maintainer.name || null) : null : null;
	const maintainerEmail = info.metadata ? info.metadata.maintainer ? (info.metadata.maintainer.email || null) : null : null;

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
	const wellKnown = (await getJson(wellKnownUrl)) as {
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

	const nodeinfo = (await getJson(link.href)) as Nodeinfo;

	return nodeinfo;
}

async function fetchMastodonInstance(host: string) {
	const json = (await getJson(`https://${host}/api/v1/instance`)) as {
		version: string;
		title: string;
		short_description: string;
		description: string;
		email: string;
	};

	return json;
}
