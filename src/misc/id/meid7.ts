import * as crypto from 'crypto';

const CHARS = '0123456789abcdef';
const CHARS_LEN = CHARS.length;

//  4bit Fixed hex value '7'
// 44bit UNIX Time ms in Hex
// 48bit Random value in Hex

function getTime(time: number) {
	if (time < 0) time = 0;
	if (time === 0) {
		return CHARS[0];
	}

	return time.toString(16).padStart(11, CHARS[0]).slice(-11);
}

function getRandom() {
	let str = '';

	for (let i = 0; i < 12; i++) {
		let rand = Math.floor((crypto.randomBytes(1).readUInt8(0) / 0xFF) * CHARS_LEN);
		if (rand === CHARS_LEN) {
			rand = CHARS_LEN - 1;
		}
		str += CHARS.charAt(rand);
	}

	return str;
}

export function genMeid7(date: Date): string {
	if (date.toString() === 'Invalid Date') throw 'Invalid Date';
	return '7' + getTime(date.getTime()) + getRandom();
}
