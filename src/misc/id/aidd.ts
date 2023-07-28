// AIDD
// 長さ8の[2000年1月1日からの経過ミリ秒をbase36でエンコードしたもの]の下1文字を削ったもの + 長さ2の個体ID + 長さ1のカウンタ
const TIME_OFFSET = 946684800000;

let nodeId: string;

let counter = 0;

const borrow = 1;	// TODO: 変更可能にする
const nodeIdLength = 1 + borrow;

function getNodeId() {
	if (!nodeId) {
		const nodeCounter = Math.floor(Math.random() * 1234567)	// TODO: Redisとかで採番
		nodeId = nodeCounter.toString(36).padStart(nodeIdLength, '0').slice(-nodeIdLength);
	}
	return nodeId;
}

function getTime(time: number) {
	time = time - TIME_OFFSET;
	if (time < 0) time = 0;

	return time.toString(36).padStart(8, '0').slice(-8, (borrow ? -borrow : undefined));
}

function getNoise() {
	return counter.toString(36).padStart(1, '0').slice(-1);
}

export function genAidd(date: Date): string {
	const t = date.getTime();
	if (isNaN(t)) throw 'Failed to create AIDD: Invalid Date';

	counter++;
	return getTime(date.getTime()) + getNodeId() + getNoise();
}
