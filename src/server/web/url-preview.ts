import * as Koa from 'koa';
import { Summary } from 'summaly';
import { fetchMeta } from '../../misc/fetch-meta';
import Logger from '../../services/logger';
import config from '../../config';
import { query } from '../../prelude/url';
import { getJson } from '../../misc/fetch';
import { sanitizeUrl } from '../../misc/sanitize-url';

const logger = new Logger('url-preview');

//#region SummaryInstance
let summaryInstance: Summary | null = null;

function getSummaryInstance(): Summary {
	if (summaryInstance) return summaryInstance;
	summaryInstance = new Summary({
		allowedPlugins: [
			'twitter',
			'youtube',
		],
	});
	return summaryInstance;
}
//#endregion


module.exports = async (ctx: Koa.Context) => {
	const meta = await fetchMeta();

	const url = sanitizeUrl(ctx.query.url);
	if (url == null) {
		ctx.status = 400;
		ctx.set('Cache-Control', 'max-age=3600');
		return;
	}

	const lang = ctx.query.lang || 'ja-JP';

	logger.info(meta.summalyProxy
		? `(Proxy) Getting preview of ${url}@${lang} ...`
		: `Getting preview of ${url}@${lang} ...`);

	try {
		const summary = meta.summalyProxy ? await getJson(`${meta.summalyProxy}?${query({
			url: url,
			lang: lang
		})}`) : await getSummaryInstance().summary(url, {
			lang: lang
		});

		logger.succ(`Got preview of ${ctx.query.url}: ${summary.title}`);

		summary.icon = wrap(summary.icon);
		summary.thumbnail = wrap(summary.thumbnail);

		if (summary.player) summary.player.url = sanitizeUrl(summary.player.url);
		summary.url = sanitizeUrl(summary.url);

		if (summary.player?.url?.startsWith('https://player.twitch.tv/')) {
			summary.player.url = summary.player.url.replace('parent=meta.tag', `parent=${config.url.replace(/^https?:[/][/]/, '')}`);
		}

		// Cache 7days
		ctx.set('Cache-Control', 'max-age=604800, immutable');

		ctx.body = summary;
	} catch (e) {
		logger.warn(`Failed to get preview of ${ctx.query.url}: ${e}`);
		ctx.status = 200;
		ctx.set('Cache-Control', 'max-age=3600, immutable');
		ctx.body = '{}';
	}
};

function wrap(url: string | null) {
	if (url == null) return null;

	if (url.match(/^https?:/)) {
		return `${config.url}/proxy/preview.jpg?${query({
			url,
			preview: '1'
		})}`
	}

	if (url.match(/^data:/)) {
		return url;
	}

	return null;
}
