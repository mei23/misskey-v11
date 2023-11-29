/*
 * Tests for Fetch resource
 *
 * How to run the tests:
 * > npx cross-env TS_NODE_FILES=true TS_NODE_TRANSPILE_ONLY=true npx mocha test/fetch-resource.ts --require ts-node/register
 *
 * To specify test:
 * > npx cross-env TS_NODE_FILES=true TS_NODE_TRANSPILE_ONLY=true npx mocha test/fetch-resource.ts --require ts-node/register -g 'test name'
 */

process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import * as childProcess from 'child_process';
import { async, startServer, signup, post, api, simpleGet, port, shutdownServer, uploadFile, getDocument } from './utils';
import * as openapi from '@redocly/openapi-core';
import rndstr from 'rndstr';
import { randomUUID } from 'crypto';
import { createSignedPost } from '../src/remote/activitypub/ap-request';
import { genRsaKeyPair } from '../src/misc/gen-key-pair';
import { StatusError, getResponse } from '../src/misc/fetch';
import * as crypto from 'crypto';

// Request Accept
const ONLY_AP = 'application/activity+json';
const PREFER_AP = 'application/activity+json, */*';
const PREFER_HTML = 'text/html, */*';
const UNSPECIFIED = '*/*';

// Response Contet-Type
const AP = 'application/activity+json; charset=utf-8';
const TYPE_JSON = 'application/json; charset=utf-8';
const HTML = 'text/html; charset=utf-8';

const CSP = `base-uri 'none'; default-src 'none'; script-src 'self' https://www.recaptcha.net/recaptcha/ https://www.gstatic.com/recaptcha/; img-src 'self' https: data: blob:; media-src 'self' https:; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-src 'self' https:; manifest-src 'self'; connect-src 'self' data: blob: ws://misskey.local https://api.rss2json.com; frame-ancestors 'none'`;

describe('Fetch resource', () => {
	let p: childProcess.ChildProcess;

	let admin: any;
	let instanceBanner: any;
	let instance: any;

	let alice: any;
	let avatar: any;
	let alicesPost: any;
	let image: any;
	let alicesPostImage: any;
	let video: any;
	let alicesPostVideo: any;
	let page: any;

	before(async () => {
		p = await startServer();

		// admin
		admin = await signup({ username: 'admin' });

		// upload instance banner
		instanceBanner = await uploadFile(admin);
		//console.log('instanceBanner', instanceBanner);

		// update instance
		await api('admin/update-meta', {
			name: 'Instance Name',
			description: 'Instance Desc',
			bannerUrl: instanceBanner.url,
		}, admin);

		instance = (await api('meta', {})).body;
		//console.log('instance', instance);

		// signup
		alice = await signup({ username: 'alice' });
		//console.log('alice', alice);

		// upload avatar
		avatar = await uploadFile(alice);
		//console.log('avatar', avatar);

		// update profile
		const token = alice.token;

		const res = await api('i/update', {
			name: 'Alice',
			description: 'Alice Desc',
			avatarId: avatar.id,
		}, alice);

		alice = res.body;
		alice.token = token;	// tokenはsignup以外では返ってこない
		//console.log('alice-2', alice);

		// post
		alicesPost = await post(alice, {
			text: 'test',
		});
		//console.log('alicesPost', alicesPost);

		// upload image
		image = await uploadFile(alice);
		//console.log('image', image);

		// post image
		alicesPostImage = await post(alice, {
			text: 'image',
			fileIds: [ image.id ],
		});
		//console.log('alicesPostImage', alicesPostImage);

		// upload video
		video = await uploadFile(alice, 'anime.mp4');
		//console.log('video', video);

		// post video
		alicesPostVideo = await post(alice, {
			text: 'video',
			fileIds: [ video.id ],
		});
		//console.log('alicesPostVideo', alicesPostVideo);

		const pageRes = await api('pages/create', {
			title: '',
			name: rndstr(),
			summary: null,
			font: 'sans-serif',
			hideTitleWhenPinned: false,
			sensitive: false,
			alignCenter: false,
			content: [ { id: randomUUID(), type: 'text', text: 'Hello World!' } ],
			variables: [],
			eyeCatchingImageId :null,
		}, alice);
		page = pageRes.body;
		//console.log('page', page);
	});

	after(async () => {
		await shutdownServer(p);
	});

	describe('Common', () => {
		it('meta', async(async () => {
			const res = await api('meta', {
			});

			assert.strictEqual(res.status, 200);
		}));

		it('GET root', async(async () => {
			const res = await simpleGet('/');
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
			assert.strictEqual(res.cspx, CSP);
		}));

		it('GET docs', async(async () => {
			const res = await simpleGet('/docs/ja-JP/about');
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
			assert.strictEqual(res.cspx, CSP);
		}));

		it('GET api-doc', async(async () => {
			const res = await simpleGet('/api-doc');
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
			assert.strictEqual(res.cspx, CSP);
		}));

		it('GET api.json', async(async () => {
			const res = await simpleGet('/api.json');
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, TYPE_JSON);
		}));

		it('Validate api.json', async(async () => {
			const config = await openapi.loadConfig();
			const result = await openapi.bundle({
				config,
				ref: `http://localhost:${port}/api.json`
			});

			for (const problem of result.problems) {
				console.log(`${problem.message} - ${problem.location[0]?.pointer}`);
			}

			assert.strictEqual(result.problems.length, 0);
		}));

		it('GET info', async(async () => {
			const res = await simpleGet('/info');
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
			assert.strictEqual(res.cspx, CSP);
		}));

		it('GET flush', async(async () => {
			const res = await simpleGet('/flush');
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
			assert.strictEqual(res.cspx, CSP);
		}));

		it('GET page', (async () => {
			const res = await simpleGet(`/@alice/pages/${page.name}`);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
			assert.strictEqual(res.cspx, CSP);
		}));

		it('GET embed', (async () => {
			const res = await simpleGet(`/notes/${alicesPostVideo.id}/embed`);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
			assert.strictEqual(res.cspx, CSP);
		}));

		it('GET image', (async () => {
			const u = new URL(image.url);
			const res = await simpleGet(`${u.pathname}`);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, 'image/jpeg');
			assert.strictEqual(res.cspx, `default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'`);
		}));

		it('GET favicon.ico', async(async () => {
			const res = await simpleGet('/favicon.ico');
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, 'image/x-icon');
		}));

		it('GET apple-touch-icon.png', async(async () => {
			const res = await simpleGet('/apple-touch-icon.png');
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, 'image/png');
		}));
	});

	describe('/@:username', () => {
		it('Only AP => AP', async(async () => {
			const res = await simpleGet(`/@${alice.username}`, ONLY_AP);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, AP);
		}));

		it('Prefer AP => AP', async(async () => {
			const res = await simpleGet(`/@${alice.username}`, PREFER_AP);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, AP);
		}));

		it('Prefer HTML => HTML', async(async () => {
			const res = await simpleGet(`/@${alice.username}`, PREFER_HTML);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
			assert.strictEqual(res.cspx, CSP);
		}));

		it('Unspecified => HTML', async(async () => {
			const res = await simpleGet(`/@${alice.username}`, UNSPECIFIED);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
			assert.strictEqual(res.cspx, CSP);
		}));
	});

	describe('/users/:id', () => {
		it('Only AP => AP', async(async () => {
			const res = await simpleGet(`/users/${alice.id}`, ONLY_AP);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, AP);
		}));

		it('Prefer AP => AP', async(async () => {
			const res = await simpleGet(`/users/${alice.id}`, PREFER_AP);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, AP);
		}));

		it('Prefer HTML => Redirect to /@:username', async(async () => {
			const res = await simpleGet(`/users/${alice.id}`, PREFER_HTML);
			assert.strictEqual(res.status, 302);
			assert.strictEqual(res.location, `/@${alice.username}`);
		}));

		it('Undecided => AP', async(async () => {
			const res = await simpleGet(`/users/${alice.id}`, UNSPECIFIED);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, AP);
		}));
	});

	describe('/notes/:id', () => {
		it('Only AP => AP', async(async () => {
			const res = await simpleGet(`/notes/${alicesPost.id}`, ONLY_AP);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, AP);
		}));

		it('Prefer AP => AP', async(async () => {
			const res = await simpleGet(`/notes/${alicesPost.id}`, PREFER_AP);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, AP);
		}));

		it('Prefer HTML => HTML', async(async () => {
			const res = await simpleGet(`/notes/${alicesPost.id}`, PREFER_HTML);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
			assert.strictEqual(res.cspx, CSP);
		}));

		it('Unspecified => HTML', async(async () => {
			const res = await simpleGet(`/notes/${alicesPost.id}`, UNSPECIFIED);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
			assert.strictEqual(res.cspx, CSP);
		}));
	});

	describe('Feeds', () => {
		it('RSS', async(async () => {
			const res = await simpleGet(`/@${alice.username}.rss`, UNSPECIFIED);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, 'application/rss+xml; charset=utf-8');
		}));

		it('ATOM', async(async () => {
			const res = await simpleGet(`/@${alice.username}.atom`, UNSPECIFIED);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, 'application/atom+xml; charset=utf-8');
		}));

		it('JSON', async(async () => {
			const res = await simpleGet(`/@${alice.username}.json`, UNSPECIFIED);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, 'application/json; charset=utf-8');
		}));
	});

	describe('HTML meta', () => {
		const parse = (doc: Document) => {
			return {
				// Title
				'title': doc.querySelector('title')?.textContent,
				'og:title': doc.querySelector('meta[property="og:title"]')?.getAttribute('content'),
				'og:site_name': doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content'),

				// Description
				'description': doc.querySelector('meta[name=description]')?.getAttribute('content'),
				'og:description': doc.querySelector('meta[property="og:description"]')?.getAttribute('content'),

				// Twitter card
				'twitter:card': doc.querySelector('meta[name="twitter:card"]')?.getAttribute('content'),

				// Misskey
				'misskey:user-username': doc.querySelector('meta[name="misskey:user-username"]')?.getAttribute('content'),
				'misskey:user-id': doc.querySelector('meta[name="misskey:user-id"]')?.getAttribute('content'),

				// Generic - og
				'og:url': doc.querySelector('meta[property="og:url"]')?.getAttribute('content'),
				'og:image': doc.querySelector('meta[property="og:image"]')?.getAttribute('content'),
				'og:published_time': doc.querySelector('meta[property="og:published_time"]')?.getAttribute('content'),

				// Player - Twitter
				'twitter:player': doc.querySelector('meta[name="twitter:player"]')?.getAttribute('content'),
				'twitter:player:width': doc.querySelector('meta[name="twitter:player:width"]')?.getAttribute('content'),
				'twitter:player:height': doc.querySelector('meta[name="twitter:player:height"]')?.getAttribute('content'),
				'twitter:player:stream': doc.querySelector('meta[name="twitter:player:stream"]')?.getAttribute('content'),
				'twitter:player:stream:content_type': doc.querySelector('meta[name="twitter:player:stream:content_type"]')?.getAttribute('content'),

				// Player - og
				'og:video:url': doc.querySelector('meta[property="og:video:url"]')?.getAttribute('content'),
				'og:video:secure_url': doc.querySelector('meta[property="og:video:secure_url"]')?.getAttribute('content'),
				'og:video:type': doc.querySelector('meta[property="og:video:type"]')?.getAttribute('content'),
				'og:video:width': doc.querySelector('meta[property="og:video:width"]')?.getAttribute('content'),
				'og:video:height': doc.querySelector('meta[property="og:video:height"]')?.getAttribute('content'),
			};
		}

		it('/', async(async () => {
			const parsed = parse(await getDocument('/'));

			assert.deepStrictEqual(parsed, {
				'title': instance.name,
				'og:title': instance.name,
				'og:site_name': instance.name,
				'description': instance.description,
				'og:description': instance.description,
				'twitter:card': 'summary',
				'misskey:user-username': undefined,
				'misskey:user-id': undefined,
				'og:url': undefined,
				'og:image': instanceBanner.url,
				'og:published_time': undefined,
				'twitter:player': undefined,
				'twitter:player:width': undefined,
				'twitter:player:height': undefined,
				'twitter:player:stream': undefined,
				'twitter:player:stream:content_type': undefined,
				'og:video:url': undefined,
				'og:video:secure_url': undefined,
				'og:video:type': undefined,
				'og:video:width': undefined,
				'og:video:height': undefined,
			});
		}));

		it('user', async(async () => {
			const parsed = parse(await getDocument(`/@${alice.username}`));

			assert.deepStrictEqual(parsed, {
				'title': `${alice.name} (@${alice.username}) | ${instance.name}`,
				'og:title': `${alice.name} (@${alice.username})`,
				'og:site_name': instance.name,
				'description': alice.description,
				'og:description': alice.description,
				'twitter:card': 'summary',
				'misskey:user-username': alice.username,
				'misskey:user-id': alice.id,
				'og:url': `http://misskey.local/@${alice.username}`,
				'og:image': alice.avatarUrl,
				'og:published_time': undefined,
				'twitter:player': undefined,
				'twitter:player:width': undefined,
				'twitter:player:height': undefined,
				'twitter:player:stream': undefined,
				'twitter:player:stream:content_type': undefined,
				'og:video:url': undefined,
				'og:video:secure_url': undefined,
				'og:video:type': undefined,
				'og:video:width': undefined,
				'og:video:height': undefined,
			});
		}));

		it('note', async(async () => {
			const parsed = parse(await getDocument(`/notes/${alicesPost.id}`));

			assert.deepStrictEqual(parsed, {
				'title': `${alice.name} (@${alice.username}) | ${instance.name}`,
				'og:title': `${alice.name} (@${alice.username})`,
				'og:site_name': instance.name,
				'description': alicesPost.text,
				'og:description': alicesPost.text,
				'twitter:card': 'summary',
				'misskey:user-username': alice.username,
				'misskey:user-id': alice.id,
				'og:url': `http://misskey.local/notes/${alicesPost.id}`,
				'og:image': alice.avatarUrl,
				'og:published_time': alicesPost.createdAt,
				'twitter:player': undefined,
				'twitter:player:width': undefined,
				'twitter:player:height': undefined,
				'twitter:player:stream': undefined,
				'twitter:player:stream:content_type': undefined,
				'og:video:url': undefined,
				'og:video:secure_url': undefined,
				'og:video:type': undefined,
				'og:video:width': undefined,
				'og:video:height': undefined,
			});
		}));

		it('note with image', async(async () => {
			const parsed = parse(await getDocument(`/notes/${alicesPostImage.id}`));

			assert.deepStrictEqual(parsed, {
				'title': `${alice.name} (@${alice.username}) | ${instance.name}`,
				'og:title': `${alice.name} (@${alice.username})`,
				'og:site_name': instance.name,
				'description': `${alicesPostImage.text} (📎1)`,
				'og:description': `${alicesPostImage.text} (📎1)`,
				'twitter:card': 'summary',
				'misskey:user-username': alice.username,
				'misskey:user-id': alice.id,
				'og:url': `http://misskey.local/notes/${alicesPostImage.id}`,
				'og:image': alicesPostImage.files[0].thumbnailUrl,
				'og:published_time': alicesPostImage.createdAt,
				'twitter:player': undefined,
				'twitter:player:width': undefined,
				'twitter:player:height': undefined,
				'twitter:player:stream': undefined,
				'twitter:player:stream:content_type': undefined,
				'og:video:url': undefined,
				'og:video:secure_url': undefined,
				'og:video:type': undefined,
				'og:video:width': undefined,
				'og:video:height': undefined,
			});
		}));

		it('note with video', async(async () => {
			const parsed = parse(await getDocument(`/notes/${alicesPostVideo.id}`));

			assert.deepStrictEqual(parsed, {
				'title': `${alice.name} (@${alice.username}) | ${instance.name}`,
				'og:title': `${alice.name} (@${alice.username})`,
				'og:site_name': instance.name,
				'description': `${alicesPostVideo.text} (📎1)`,
				'og:description': `${alicesPostVideo.text} (📎1)`,
				'twitter:card': 'player',
				'misskey:user-username': alice.username,
				'misskey:user-id': alice.id,
				'og:url': `http://misskey.local/notes/${alicesPostVideo.id}`,
				'og:image': alicesPostVideo.files[0].thumbnailUrl,
				'og:published_time': alicesPostVideo.createdAt,
				'twitter:player':  `http://misskey.local/notes/${alicesPostVideo.id}/embed`,
				'twitter:player:width': '530',
				'twitter:player:height': '255',
				'twitter:player:stream': alicesPostVideo.files[0].url,
				'twitter:player:stream:content_type': alicesPostVideo.files[0].type,
				'og:video:url': `http://misskey.local/notes/${alicesPostVideo.id}/embed`,
				'og:video:secure_url': `http://misskey.local/notes/${alicesPostVideo.id}/embed`,
				'og:video:type': 'text/html',
				'og:video:width': '530',
				'og:video:height': '255',
			});
		}));
	});

	describe('inbox', async () => {
		const myInbox = `http://localhost:${port}/inbox`;

		const myHost = 'misskey.local';
		const xHost = 'xxx.local';

		const inboxPost = async (url: string, headers: Record<string, string>, body: string) => {
			const res = await getResponse({
				url,
				method: 'POST',
				headers,
				body,
				timeout: 10 * 1000,
			}).then(r => {
				return {
					statusCode: r.statusCode,
					statusMessage: r.statusMessage,
					body: r.body,
				};
			}).catch(err => {
				if (err instanceof StatusError) {
					return {
						statusCode: err.statusCode,
						statusMessage: err.statusMessage,
					};
				} else {
					throw err;
				}
			});
			return res;
		};

		// 鍵はここでは検証しないのでなんでもいい
		let keyPair: any;
		let key: any;

		before(async () => {
			keyPair = await genRsaKeyPair();
			key = {
				privateKeyPem: keyPair.privateKey,
				keyId: `https://${myHost}/users/a#main-key`,
			};
		});

		it('Accepted', async () => {
			const object = { a: 1, b: 2, };
			const body = JSON.stringify(object);

			const req = createSignedPost({
				key,
				url: myInbox,
				body,
				additionalHeaders: {
					Host: myHost,
				},
			});
		
			const res = await inboxPost(myInbox, req.request.headers, body);

			assert.strictEqual(res.statusCode, 202);
		});

		it('Invalid Host', async () => {
			const object = { a: 1, b: 2, };
			const body = JSON.stringify(object);

			const req = createSignedPost({
				key,
				url: myInbox,
				body,
				additionalHeaders: {
					Host: xHost,	// ★署名されているが違うホスト向け
				},
			});
		
			const res = await inboxPost(myInbox, req.request.headers, body);

			assert.strictEqual(res.statusCode, 400);
			assert.strictEqual(res.statusMessage, 'Invalid Host');
		});

		it('Payload Too Large', async () => {
			const object = { a: 1, b: 'x'.repeat(70000), };	// ★でかすぎ
			const body = JSON.stringify(object);

			const req = createSignedPost({
				key,
				url: myInbox,
				body,
				additionalHeaders: {
					Host: myHost,
				},
			});
		
			const res = await inboxPost(myInbox, req.request.headers, body);

			assert.strictEqual(res.statusCode, 413);
		});

		it('Missing Required Header in the request - signature', async () => {
			const object = { a: 1, b: 2, };
			const body = JSON.stringify(object);

			const req = createSignedPost({
				key,
				url: myInbox,
				body,
				additionalHeaders: {
					Host: myHost,
				},
			});

			delete req.request.headers.signature;	// ★署名されてない

			const res = await inboxPost(myInbox, req.request.headers, body);

			assert.strictEqual(res.statusCode, 401);
			assert.strictEqual(res.statusMessage, 'Missing Required Header');	// TODO: どのheaderがどこに足りないのか
		});

		it('Missing Required Header in the request - digest', async () => {
			const object = { a: 1, b: 2, };
			const body = JSON.stringify(object);

			const req = createSignedPost({
				key,
				url: myInbox,
				body,
				additionalHeaders: {
					Host: myHost,
				},
			});

			delete req.request.headers.digest;	// ★署名されているがrequestにDigestヘッダーがない

			const res = await inboxPost(myInbox, req.request.headers, body);

			assert.strictEqual(res.statusCode, 401);
			assert.strictEqual(res.statusMessage, 'Missing Required Header');	// TODO: どのheaderがどこに足りないのか
		});

		it('Expired Request Error', async () => {
			const object = { a: 1, b: 2, };
			const body = JSON.stringify(object);

			const req = createSignedPost({
				key,
				url: myInbox,
				body,
				additionalHeaders: {
					Host: myHost,
					Date: new Date(new Date().getTime() - 600 * 1000).toISOString(),	// ★署名されてるがDateが古すぎる
				},
			});
		
			const res = await inboxPost(myInbox, req.request.headers, body);

			assert.strictEqual(res.statusCode, 401);
			assert.strictEqual(res.statusMessage, 'Expired Request Error');
		});

		// TODO: signatureの方に必須ヘッダーがないパターン

		it('Invalid Digest Header', async () => {
			const object = { a: 1, b: 2, };
			const body = JSON.stringify(object);

			const req = createSignedPost({
				key,
				url: myInbox,
				body,
				additionalHeaders: {
					Host: myHost,
				},
			});

			req.request.headers.digest = 'puee';	// ★

			const res = await inboxPost(myInbox, req.request.headers, body);

			assert.strictEqual(res.statusCode, 401);
			assert.strictEqual(res.statusMessage, 'Invalid Digest Header');
		});

		it('Unsupported Digest Algorithm', async () => {
			const object = { a: 1, b: 2, };
			const body = JSON.stringify(object);

			const req = createSignedPost({
				key,
				url: myInbox,
				body,
				additionalHeaders: {
					Host: myHost,
				},
			});

			req.request.headers.digest = 'SHA-5000=abc';	// ★

			const res = await inboxPost(myInbox, req.request.headers, body);

			assert.strictEqual(res.statusCode, 401);
			assert.strictEqual(res.statusMessage, 'Unsupported Digest Algorithm');
		});

		it('Digest Missmath', async () => {
			const object = { a: 1, b: 2, };
			const body = JSON.stringify(object);

			const req = createSignedPost({
				key,
				url: myInbox,
				body,
				additionalHeaders: {
					Host: myHost,
				},
			});
		
			req.request.headers.digest = `SHA-256=${crypto.createHash('sha256').update('puppukupu-').digest('base64')}`;	// ★

			const res = await inboxPost(myInbox, req.request.headers, body);

			assert.strictEqual(res.statusCode, 401);
			assert.strictEqual(res.statusMessage, 'Digest Missmatch');
		});
	});
});
