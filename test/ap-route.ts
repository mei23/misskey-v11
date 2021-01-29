/*
 * Tests of AP route negotiation
 *
 * How to run the tests:
 * > TS_NODE_FILES=true npx mocha test/ap-route.ts --require ts-node/register
 *
 * To specify test:
 * > TS_NODE_FILES=true npx mocha test/ap-route.ts --require ts-node/register -g 'test name'
 */

process.env.NODE_ENV = 'test';

import * as childProcess from 'child_process';
import * as assert from 'assert';
import { async, signup, post, simpleGet, launchServer } from './utils';

const db = require('../built/db/mongodb').default;

// Request Accept
const ONLY_AP = 'application/activity+json';
const PREFER_AP = 'application/activity+json, */*';
const PREFER_HTML = 'text/html, */*';
const UNSPECIFIED = '*/*';

// Response Contet-Type
const AP = 'application/activity+json; charset=utf-8';
const HTML = 'text/html; charset=utf-8';

describe('AP route negotiation', () => {
	let p: childProcess.ChildProcess;

	let alice: any;
	let alicesPost: any;

	before(launchServer(g => p = g, async () => {

		await Promise.all([
			db.get('users').drop(),
			db.get('notes').drop(),
		]);

		alice = await signup({ username: 'alice' });
		alicesPost = await post(alice, {
			text: 'test'
		});
	}));

	after(() => {
		p.kill();
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
		}));

		it('Unspecified => HTML', async(async () => {
			const res = await simpleGet(`/@${alice.username}`, UNSPECIFIED);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
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
		}));

		it('Unspecified => HTML', async(async () => {
			const res = await simpleGet(`/notes/${alicesPost.id}`, UNSPECIFIED);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
		}));
	});
});
