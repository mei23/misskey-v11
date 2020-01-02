import * as fs from 'fs';
import * as fileType from 'file-type';
import checkSvg from '../misc/check-svg';
const probeImageSize = require('probe-image-size');

export async function detectMine(path: string) {
	let type = await detectType(path);

	if (type.mime.startsWith('image/')) {
		const imageSize = await detectImageSize(path).catch(() => null);

		// うまく判定できない画像は octet-stream にする
		if (!imageSize) {
			type = {
				mime: 'application/octet-stream',
				ext: null
			};
		}

		// 制限を超えている画像は octet-stream にする
		if (imageSize.wUnits === 'px' && (imageSize.width > 16383 || imageSize.height > 16383)) {
			type = {
				mime: 'application/octet-stream',
				ext: null
			};
		}
	}

	return [type.mime, type.ext];
}

async function detectType(path: string) {
	// Check 0 byte
	const fileSize = await detectFileSize(path);
	if (fileSize === 0) {
		return {
			mime: 'application/octet-stream',
			ext: null
		};
	}

	const readable = fs.createReadStream(path);
	const type = (await fileType.stream(readable)).fileType;
	readable.destroy();

	if (type) {
		// XMLはSVGかもしれない
		if (type.mime === 'application/xml' && checkSvg(path)) {
			return {
				mime: 'image/svg+xml',
				ext: 'svg'
			};
		}

		return {
			mime: type.mime,
			ext: type.ext
		};
	}

	// 種類が不明でもSVGかもしれない
	if (checkSvg(path)) {
		return {
			mime: 'image/svg+xml',
			ext: 'svg'
		};
	}

	// それでも種類が不明なら application/octet-stream にする
	return {
		mime: 'application/octet-stream',
		ext: null
	};
}

async function detectFileSize(path: string) {
	return new Promise<number>((res, rej) => {
		fs.stat(path, (err, stats) => {
			if (err) return rej(err);
			res(stats.size);
		});
	});
}

async function detectImageSize(path: string) {
	const readable = fs.createReadStream(path);
	const imageSize = await probeImageSize(readable) as {
		width: number;
		height: number;
		wUnits: string;
		hUnits: string;
	};
	readable.destroy();

	return imageSize;
}
