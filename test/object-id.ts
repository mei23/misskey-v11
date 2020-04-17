/*
 * Tests of ObjectID
 *
 * How to run the tests:
 * > TS_NODE_FILES=true mocha test/object-id.ts --require ts-node/register
 *
 * To specify test:
 * > TS_NODE_FILES=true mocha test/object-id.ts --require ts-node/register -g 'test name'
 */

import * as assert from 'assert';
import { ObjectID } from 'mongodb';
import isObjectid from '../src/misc/is-objectid';
import { transform } from '../src/misc/cafy-id';
import { oidEquals } from '../src/prelude/oid';

const id1 = '7170713cf03889eeb26d09c9';
const id2 = '7170715a3c724cf1643291ec';

describe('isObjectid', () => {
	it('ObjectID', () => {
		assert.strictEqual(isObjectid(new ObjectID(id1)), true);
	});

	it('文字列だったらObjectIDではない', () => {
		assert.strictEqual(isObjectid(id1), false);
	});

	it('他のObjectだったらObjectIDではない', () => {
		assert.strictEqual(isObjectid({}), false);
	});

	it('ArrayだったらObjectIDではない', () => {
		assert.strictEqual(isObjectid([]), false);
	});
});

describe('transform', () => {
	it('from string', () => {
		const expect = new ObjectID(id1);
		const actual = transform(id1);
		assert.strictEqual(expect.toHexString(), actual!.toHexString());
	});

	it('from ObjectID', () => {
		const expect = new ObjectID(id1);
		const actual = transform(new ObjectID(id1));
		assert.strictEqual(expect.toHexString(), actual!.toHexString());
	});

	it('null to null', () => {
		assert.strictEqual(transform(null), null);
	});

	it('undefined to undefined', () => {
		assert.strictEqual(transform(undefined), undefined);
	});
});

describe('oidEquals', () => {
	it('string1, string1', () => {
		assert.strictEqual(oidEquals(id1, id1), true);
	});
	it('string2, string2', () => {
		assert.strictEqual(oidEquals(id1, id2), false);
	});

	it('obj1, obj1', () => {
		assert.strictEqual(oidEquals(new ObjectID(id1), new ObjectID(id1)), true);
	});
	it('obj1, obj2', () => {
		assert.strictEqual(oidEquals(new ObjectID(id1), new ObjectID(id2)), false);
	});

	it('string1, obj1', () => {
		assert.strictEqual(oidEquals(id1, new ObjectID(id1)), true);
	});
	it('string1, obj2', () => {
		assert.strictEqual(oidEquals(id1, new ObjectID(id2)), false);
	});

	it('null, string1', () => {
		assert.strictEqual(oidEquals(null, id1), false);
	});

	it('null, obj1', () => {
		assert.strictEqual(oidEquals(null, new ObjectID(id1)), false);
	});

	it('null, null', () => {
		assert.strictEqual(oidEquals(null, null), true);
	});
});
