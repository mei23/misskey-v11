import * as crypto from 'crypto';

const CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';
const CHARS_LEN = CHARS.length;

export function genFid(): string {
	return getRandom(24);
}

function getRandom(num: number) {
	let str = '';

	for (let i = 0; i < num; i++) {
		let rand = Math.floor((crypto.randomBytes(1).readUInt8(0) / 0xFF) * CHARS_LEN);
		if (rand === CHARS_LEN) {
			rand = CHARS_LEN - 1;
		}
		str += CHARS.charAt(rand);
	}

	return str;
}
