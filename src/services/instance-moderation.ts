import { toPuny } from '../misc/convert-host';
import { fetchMeta } from '../misc/fetch-meta';
import { Instances } from '../models';
import { getServerSubscriber } from '../services/server-subscriber';

let closedHosts: Set<string>;

export async function isBlockedHost(host: string | null) {
	if (host == null) return false;
	const meta = await fetchMeta();
	return meta.blockedHosts.includes(toPuny(host));
}

export async function isClosedHost(host: string | null) {
	if (host == null) return false;
	if (!closedHosts) await Update();
	return closedHosts?.has(toPuny(host));
}

async function Update() {
	const closed = await Instances.find({
		isMarkedAsClosed: true
	});
	closedHosts = new Set(closed.map(x => toPuny(x.host)));
}

// 初回アップデート
Update();

// 一定時間ごとにアップデート
setInterval(() => {
	Update();
}, 300 * 1000);

// イベントでアップデート
const ev = getServerSubscriber();

ev.on('serverEvent', (data: any) => {
	if (data.type === 'instanceModUpdated') {
		Update();
	}
});
