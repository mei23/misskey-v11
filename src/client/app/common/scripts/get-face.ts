/* tslint:disable:quotemark */
const faces = [
	"(=^・・^=)",
	"v('ω')v",
	"🐡( '-' 🐡 )ﾌｸﾞﾊﾟﾝﾁ!!!!",
	"✌️(´･_･`)✌️",
	"(｡>﹏<｡)",
	"(Δ・x・Δ)",
	"( ‘ω’ و(و “",
	"ԅ( ˘ω˘ ԅ)ﾓﾐﾓﾐ",
];

let pasts: string[] = [];
const back = 9;

export default () => {
	const kakutei = faces[2];
	let face = faces[Math.floor(Math.random() * faces.length)];

	if (face !== kakutei && pasts.length >= back && !pasts.includes(kakutei)) {
		face = kakutei;
	}

	pasts.unshift(face);
	pasts = pasts.splice(0, back);

	return face;
};
