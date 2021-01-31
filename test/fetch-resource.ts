/*
 * Tests for Fetch resource
 *
 * How to run the tests:
 * > TS_NODE_FILES=true npx mocha test/fetch-resource.ts --require ts-node/register
 *
 * To specify test:
 * > TS_NODE_FILES=true npx mocha test/fetch-resource.ts --require ts-node/register -g 'test name'
 */

process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import * as childProcess from 'child_process';
import { async, launchServer, api, simpleGet  } from './utils';

describe('Fetch resource', () => {
	let p: childProcess.ChildProcess;

	before(launchServer(g => p = g, async () => {
	}));

	after(() => {
		p.kill();
	});

	it('meta', async(async () => {
		const res = await api('meta', {
		});

		assert.strictEqual(res.status, 200);
	}));

	it('GET root', async(async () => {
		const res = await simpleGet('/', 'text/html');
		assert.strictEqual(res.status, 200);
	}));

	it('GET docs', async(async () => {
		const res = await simpleGet('/docs/ja-JP/about', 'text/html');
		assert.strictEqual(res.status, 200);
	}));

	it('GET api-doc', async(async () => {
		const res = await simpleGet('/api-doc', 'text/html');
		assert.strictEqual(res.status, 200);
	}));

	it('GET api.json', async(async () => {
		const res = await simpleGet('/api.json', 'application/json');
		assert.strictEqual(res.status, 200);
	}));
});
