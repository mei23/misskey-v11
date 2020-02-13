import * as sharp from 'sharp';

export type IImage = {
	data: Buffer;
	ext: string;
	type: string;
};

/**
 * Convert to JPEG
 *   with resize, remove metadata, resolve orientation, stop animation
 */
export async function convertToJpeg(path: string, width: number, height: number): Promise<IImage> {
	return convertSharpToJpeg(await sharp(path), width, height);
}

export async function convertSharpToJpeg(sharp: sharp.Sharp, width: number, height: number): Promise<IImage> {
	const data = await sharp
		.resize(width, height, {
			fit: 'inside',
			withoutEnlargement: true
		})
		.rotate()
		.jpeg({
			quality: 85,
			progressive: true
		})
		.toBuffer();

	return {
		data,
		ext: 'jpg',
		type: 'image/jpeg'
	};
}

/**
 * Convert to WebP
 *   with resize, remove metadata, resolve orientation, stop animation
 */
export async function convertToWebp(path: string, width: number, height: number): Promise<IImage> {
	return convertSharpToWebp(await sharp(path), width, height);
}

export async function convertSharpToWebp(sharp: sharp.Sharp, width: number, height: number): Promise<IImage> {
	const data = await sharp
		.resize(width, height, {
			fit: 'inside',
			withoutEnlargement: true
		})
		.rotate()
		.webp({
			quality: 85
		})
		.toBuffer();

	return {
		data,
		ext: 'webp',
		type: 'image/webp'
	};
}

/**
 * Convert to PNG
 *   with resize, remove metadata, resolve orientation, stop animation
 */
export async function convertToPng(path: string, width: number, height: number): Promise<IImage> {
	return convertSharpToPng(await sharp(path), width, height);
}

export async function convertSharpToPng(sharp: sharp.Sharp, width: number, height: number): Promise<IImage> {
	const data = await sharp
		.resize(width, height, {
			fit: 'inside',
			withoutEnlargement: true
		})
		.rotate()
		.png()
		.toBuffer();

	return {
		data,
		ext: 'png',
		type: 'image/png'
	};
}

/**
 * Convert to PNG or JPEG
 *   with resize, remove metadata, resolve orientation, stop animation
 */
export async function convertToPngOrJpeg(path: string, width: number, height: number): Promise<IImage> {
	return convertSharpToPngOrJpeg(await sharp(path), width, height);
}

export async function convertSharpToPngOrJpeg(sharp: sharp.Sharp, width: number, height: number): Promise<IImage> {
	const stats = await sharp.stats();

	// 不透明ならばJPEG
	if (stats.isOpaque) {
		return await convertSharpToJpeg(sharp, width, height);
	} else {
		return await convertSharpToPng(sharp, width, height);
	}
}
