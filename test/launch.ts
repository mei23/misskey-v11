/*
 * Tests for launce server
 *
 * How to run the tests:
 * > TS_NODE_FILES=true npx mocha test/launch.ts --require ts-node/register
 *
 * To specify test:
 * > TS_NODE_FILES=true npx mocha test/launch.ts --require ts-node/register -g 'test name'
 */

process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import * as childProcess from 'child_process';
import { async, launchServer, api, simpleGet  } from './utils';

describe('Launch server', () => {
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
});
