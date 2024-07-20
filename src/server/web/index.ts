/**
 * Web Client Server
 */

import * as os from 'os';
import ms = require('ms');
import * as Koa from 'koa';
import * as Router from '@koa/router';
import * as send from 'koa-send';
import * as favicon from 'koa-favicon';
import * as views from '@ladjs/koa-views';

import docs from './docs';
import packFeed from './feed';
import { fetchMeta } from '../../misc/fetch-meta';
import { genOpenapiSpec } from '../api/openapi/gen-spec';
import config from '../../config';
import { Users, Notes, Emojis, UserProfiles, Pages } from '../../models';
import parseAcct from '../../misc/acct/parse';
import getNoteSummary from '../../misc/get-note-summary';
import { ensure } from '../../prelude/ensure';
import { getConnection } from 'typeorm';
import redis from '../../db/redis';

const client = `${__dirname}/../../client/`;

export function genCsp() {
	const csp
	= `base-uri 'none'; `
	+ `default-src 'none'; `
	+ `script-src 'self' https://www.recaptcha.net/recaptcha/ https://www.gstatic.com/recaptcha/; `
	+ `img-src 'self' https: data: blob:; `
	+ `media-src 'self' https:; `
	+ `style-src 'self' 'unsafe-inline'; `
	+ `font-src 'self'; `
	+ `frame-src 'self' https:; `
	+ `manifest-src 'self'; `
	+ `connect-src 'self' data: blob: ${config.wsUrl} https://api.rss2json.com; `	// wssを指定しないとSafariで動かない https://github.com/w3c/webappsec-csp/issues/7#issuecomment-1086257826
	+ `frame-ancestors 'none'`;

	return { csp };
}

// Init app
const app = new Koa();

// Init renderer
app.use(views(__dirname + '/views', {
	extension: 'pug',
	options: {
		config
	}
}));

// Serve favicon
app.use(favicon(`${client}/assets/favicon.ico`));

// Init router
const router = new Router();

//#region static assets

router.get('/assets/*', async ctx => {
	await send(ctx as any, ctx.path, {
		root: client,
		maxage: ctx.path === 'boot.js' ? ms('5m') : ms('7 days'),
	});
});

// Apple touch icon
router.get('/apple-touch-icon.png', async ctx => {
	await send(ctx as any, '/assets/apple-touch-icon.png', {
		root: client
	});
});

// ServiceWorker
router.get(/^\/sw\.(.+?)\.js$/, async ctx => {
	await send(ctx as any, `/assets/sw.${ctx.params[0]}.js`, {
		root: client
	});
});

// Manifest
router.get('/manifest.json', require('./manifest'));

router.get('/robots.txt', async ctx => {
	await send(ctx as any, '/assets/robots.txt', {
		root: client
	});
});

//#endregion

// Docs
router.use('/docs', docs.routes());
router.get('/api-doc', async ctx => {
	const { csp } = genCsp();

	await ctx.render('redoc', {
		version: config.version,
	});

	ctx.set('Content-Security-Policy', csp);
	ctx.set('Cache-Control', 'public, max-age=60');
});

// URL preview endpoint
router.get('/url', require('./url-preview'));

router.get('/api.json', async ctx => {
	ctx.body = genOpenapiSpec();
});

const getFeed = async (acct: string) => {
	const { username, host } = parseAcct(acct);
	const user = await Users.findOne({
		usernameLower: username.toLowerCase(),
		host,
		isSuspended: false
	});

	return user && await packFeed(user);
};

// Atom
router.get('/@:user.atom', async ctx => {
	const feed = await getFeed(ctx.params.user);

	if (feed) {
		ctx.set('Content-Type', 'application/atom+xml; charset=utf-8');
		ctx.body = feed.atom1();
	} else {
		ctx.status = 404;
	}
});

// RSS
router.get('/@:user.rss', async ctx => {
	const feed = await getFeed(ctx.params.user);

	if (feed) {
		ctx.set('Content-Type', 'application/rss+xml; charset=utf-8');
		ctx.body = feed.rss2();
	} else {
		ctx.status = 404;
	}
});

// JSON
router.get('/@:user.json', async ctx => {
	const feed = await getFeed(ctx.params.user);

	if (feed) {
		ctx.set('Content-Type', 'application/json; charset=utf-8');
		ctx.body = feed.json1();
	} else {
		ctx.status = 404;
	}
});

//#region for crawlers
// User
router.get(['/@:user', '/@:user/:sub'], async (ctx, next) => {
	const { username, host } = parseAcct(ctx.params.user);
	const _user = await Users.findOne({
		usernameLower: username.toLowerCase(),
		host,
		isSuspended: false
	});

	const user = await Users.pack(_user!);

	if (user != null) {
		const profile = await UserProfiles.findOne({ userId: user.id }).then(ensure);
		const meta = await fetchMeta();
		const me = profile.fields
			? profile.fields
				.filter(filed => filed.value != null && filed.value.match(/^https?:/))
				.map(field => field.value)
			: [];

		const { csp } = genCsp();

		await ctx.render('user', {
			user, profile, me,
			version: config.version,
			sub: ctx.params.sub,
			instanceName: meta.name || 'Misskey',
			icon: meta.iconUrl
		});

		ctx.set('Content-Security-Policy', csp);
		ctx.set('Cache-Control', 'public, max-age=60');
	} else {
		// リモートユーザーなので
		// モデレータがAPI経由で参照可能にするために404にはしない
		await next();
	}
});

router.get('/users/:user', async ctx => {
	const user = await Users.findOne({
		id: ctx.params.user,
		host: null,
		isSuspended: false
	});

	if (user == null) {
		ctx.status = 404;
		return;
	}

	ctx.redirect(`/@${user.username}${ user.host == null ? '' : '@' + user.host}`);
});

// Note
router.get('/notes/:note', async ctx => {
	const note = await Notes.findOne({ id: ctx.params.note });

	if (note) {
		const _note = await Notes.pack(note);

		const meta = await fetchMeta();

		const video = (_note.files || [])
			.filter((file: any) => file.type.match(/^video/) && !file.isSensitive)
			.shift() as any;

		const audio = (_note.files || [])
			.filter((file: any) => file.type.match(/^audio/) && !file.isSensitive)
			.shift() as any;

		const image = (_note.files || [])
			.filter((file: any) => file.type.match(/^image/) && !file.isSensitive)
			.shift() as any;

		let imageUrl = video?.thumbnailUrl || image?.thumbnailUrl;

		// or avatar
		if (imageUrl == null || imageUrl === '') {
			imageUrl = (_note.user as any)?.avatarUrl;
		}

		const stream = video?.url || audio?.url;
		const type = video?.type || audio?.type;
		const player = (video || audio) ? `${config.url}/notes/${_note?.id}/embed` : null;
		const width = 530;	// TODO: thumbnail width
		const height = 255;

		const { csp } = genCsp();

		await ctx.render('note', {
			version: config.version,
			note: _note,
			summary: getNoteSummary(_note),
			imageUrl,
			instanceName: meta.name || 'Misskey',
			icon: meta.iconUrl,
			player, width, height, stream, type,
		});

		ctx.set('Content-Security-Policy', csp);
		ctx.set('Cache-Control', 'public, max-age=60');

		return;
	}

	ctx.status = 404;
});

router.get('/notes/:note/embed', async ctx => {
	ctx.remove('X-Frame-Options');

	const note = await Notes.findOne({ id: ctx.params.note });

	if (note) {
		const _note = await Notes.pack(note);

		let imageUrl;
		// use attached
		if (_note.files) {
			imageUrl = _note.files
				.filter((file: any) => file.type.match(/^(image|video)/) && !file.isSensitive)
				.map((file: any) => file.thumbnailUrl)
				.shift();
		}
		// or avatar
		if (imageUrl == null || imageUrl === '') {
			imageUrl = (_note.user as any).avatarUrl;
		}

		const video = (_note.files || [])
			.filter((file: any) => file.type.match(/^video/) && !file.isSensitive)
			.shift() as any;
		const audio = video ? undefined : (_note.files || [])
			.filter((file: any) => file.type.match(/^audio/) && !file.isSensitive)
			.shift() as any;

		const { csp } = genCsp();

		await ctx.render('note-embed', {
			video: video?.url,
			audio: audio?.url,
			type: (video || audio)?.type,
			autoplay: ctx.query.autoplay != null,
		});

		ctx.set('Content-Security-Policy', csp);

		if (['public', 'home'].includes(note.visibility)) {
			ctx.set('Cache-Control', 'public, max-age=180');
		} else {
			ctx.set('Cache-Control', 'private, max-age=0, must-revalidate');
		}

		return;
	}

	ctx.status = 404;
});

// Page
router.get('/@:user/pages/:page', async ctx => {
	const { username, host } = parseAcct(ctx.params.user);
	const user = await Users.findOne({
		usernameLower: username.toLowerCase(),
		host
	});

	if (user == null) return;

	const page = await Pages.findOne({
		name: ctx.params.page,
		userId: user.id
	});

	if (page) {
		const _page = await Pages.pack(page);
		const meta = await fetchMeta();
		const { csp } = genCsp();
		await ctx.render('page', {
			page: _page,
			instanceName: meta.name || 'Misskey'
		});

		ctx.set('Content-Security-Policy', csp);
		ctx.set('Cache-Control', 'public, max-age=60');

		return;
	}

	ctx.status = 404;
});
//#endregion

router.get('/info', async ctx => {
	const meta = await fetchMeta(true);
	const emojis = await Emojis.find({
		where: { host: null }
	});
	const { csp } = genCsp();
	await ctx.render('info', {
		version: config.version,
		machine: os.hostname(),
		os: os.platform(),
		node: process.version,
		psql: await getConnection().query('SHOW server_version').then(x => x[0].server_version),
		redis: redis.server_info.redis_version,
		cpu: {
			model: os.cpus()[0].model,
			cores: os.cpus().length
		},
		emojis: emojis,
		meta: meta,
		originalUsersCount: await Users.count({ host: null }),
		originalNotesCount: await Notes.count({ userHost: null })
	});
	ctx.set('Content-Security-Policy', csp);
	ctx.set('Cache-Control', 'public, max-age=60');
});

const override = (source: string, target: string, depth: number = 0) =>
	[, ...target.split('/').filter(x => x), ...source.split('/').filter(x => x).splice(depth)].join('/');

router.get('/othello', async ctx => ctx.redirect(override(ctx.URL.pathname, 'games/reversi', 1)));
router.get('/reversi', async ctx => ctx.redirect(override(ctx.URL.pathname, 'games')));

router.get('/flush', async ctx => {
	const { csp } = genCsp();

	await ctx.render('flush', {
		version: config.version,
	});

	ctx.set('Content-Security-Policy', csp);
});

// streamingに非WebSocketリクエストが来た場合にbase htmlをキャシュ付きで返すと、Proxy等でそのパスがキャッシュされておかしくなる
router.get('/streaming', async ctx => {
	ctx.status = 503;
	ctx.set('Cache-Control', 'private, max-age=0');
});

// Render base html for all requests
router.get('*', async ctx => {
	const meta = await fetchMeta();
	const { csp } = genCsp();
	await ctx.render('base', {
		version: config.version,
		img: meta.bannerUrl,
		title: meta.name || 'Misskey',
		instanceName: meta.name || 'Misskey',
		desc: meta.description,
		icon: meta.iconUrl
	});
	ctx.set('Content-Security-Policy', csp);
	ctx.set('Cache-Control', 'public, max-age=60');
});

// Register router
app.use(router.routes());

module.exports = app;
