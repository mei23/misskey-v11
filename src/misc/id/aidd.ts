// AIDD
// 長さ8の[2000年1月1日からの経過ミリ秒をbase36でエンコードしたもの]の下1文字を削ったもの + 長さ2の個体ID + 長さ1のカウンタ
const TIME_OFFSET = 946684800000;

let nodeId: number;

let counter = 0;

function getNodeId() {
	if (!nodeId) {
		nodeId = Math.floor(Math.random() * 36 * 36);	// TODO DBとかで採番
	}
	return nodeId;
}

function getTime(time: number) {
	time = time - TIME_OFFSET;
	if (time < 0) time = 0;

	return time.toString(36).padStart(8, '0').slice(-8, -1);
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
