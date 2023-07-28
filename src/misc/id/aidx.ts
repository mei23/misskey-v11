// AIDX
// 長さ8の[2000年1月1日からの経過ミリ秒をbase36でエンコードしたもの] + 長さ4の個体ID + 長さ4のカウンタ
import { customAlphabet } from 'nanoid'

const TIME_OFFSET = 946684800000;
const TIME_LENGTH = 8;
const NODE_LENGTH = 4;
const NOISE_LENGTH = 4;

const nodeId = customAlphabet('0123456789abcdefghjkmnpqrstvwxyz', NODE_LENGTH)();
let counter = 0;

function getTime(time: number) {
	time = time - TIME_OFFSET;
	if (time < 0) time = 0;

	return time.toString(36).padStart(TIME_LENGTH, '0').slice(-TIME_LENGTH);
}

function getNoise() {
	return counter.toString(36).padStart(NOISE_LENGTH, '0').slice(-NOISE_LENGTH);
}

export function genAidx(date: Date): string {
	const t = date.getTime();
	if (isNaN(t)) throw 'Failed to create AIDX: Invalid Date';

	counter++;
	return getTime(date.getTime()) + nodeId + getNoise();
}
