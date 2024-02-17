import * as Koa from 'koa';
import * as send from 'koa-send';
import * as rename from 'rename';
import * as tmp from 'tmp';
import * as fs from 'fs';
import * as stream from 'stream';
import { serverLogger } from '..';
import { contentDisposition } from '../../misc/content-disposition';
import { DriveFiles } from '../../models';
import { InternalStorage } from '../../services/drive/internal-storage';
import { downloadUrl } from '../../misc/download-url';
import { detectType } from '../../misc/get-file-info';
import { convertToJpeg, convertToPngOrJpeg } from '../../services/drive/image-processor';
import { generateVideoThumbnail } from '../../services/drive/generate-video-thumbnail';
import { StatusError } from '../../misc/fetch';

const assets = `${__dirname}/../../server/file/assets/`;

const commonReadableHandlerGenerator = (ctx: Koa.Context) => (e: Error): void => {
	serverLogger.error(e);
	ctx.status = 500;
	ctx.set('Cache-Control', 'max-age=300');
};

export default async function(ctx: Koa.Context) {
	const key = ctx.params.key;

	// Fetch drive file
	const file = await DriveFiles.createQueryBuilder('file')
		.where('file.accessKey = :accessKey', { accessKey: key })
		.orWhere('file.thumbnailAccessKey = :thumbnailAccessKey', { thumbnailAccessKey: key })
		.orWhere('file.webpublicAccessKey = :webpublicAccessKey', { webpublicAccessKey: key })
		.getOne();

	if (file == null) {
		ctx.status = 404;
		ctx.set('Cache-Control', 'max-age=86400');
		await send(ctx as any, '/dummy.png', { root: assets });
		return;
	}

	const isThumbnail = file.thumbnailAccessKey === key;
	const isWebpublic = file.webpublicAccessKey === key;

	if (!file.storedInternal) {
		if (file.isLink && file.uri) {	// 期限切れリモートファイル
			const [path, cleanup] = await new Promise<[string, any]>((res, rej) => {
				tmp.file((e, path, fd, cleanup) => {
					if (e) return rej(e);
					res([path, cleanup]);
				});
			});

			try {
				await downloadUrl(file.uri, path);

				const { mime, ext } = await detectType(path);

				const convertFile = async () => {
					if (isThumbnail) {
						if (['image/jpeg', 'image/webp'].includes(mime)) {
							return await convertToJpeg(path, 498, 280);
						} else if (['image/png'].includes(mime)) {
							return await convertToPngOrJpeg(path, 498, 280);
						} else if (mime.startsWith('video/')) {
							return await generateVideoThumbnail(path);
						}
					}

					return {
						data: await fs.promises.readFile(path),
						ext,
						type: mime,
					};
				};

				const image = await convertFile();
				sendNormal(ctx, image.data, image.type);
			} catch (e) {
				serverLogger.error(`${e}`);

				if (e instanceof StatusError && e.isClientError) {
					ctx.status = e.statusCode;
					ctx.set('Cache-Control', 'max-age=86400');
				} else {
					ctx.status = 500;
					ctx.set('Cache-Control', 'max-age=300');
				}
			} finally {
				cleanup();
			}
			return;
		}

		ctx.status = 204;
		ctx.set('Cache-Control', 'max-age=86400');
		return;
	}

	if (isThumbnail || isWebpublic) {
		const { mime, ext } = await detectType(InternalStorage.resolvePath(key));
		const filename = rename(file.name, {
			suffix: isThumbnail ? '-thumb' : '-web',
			extname: ext ? `.${ext}` : undefined
		}).toString();

		sendNormal(ctx, InternalStorage.read(key), mime, filename);
	} else {
		const readable = InternalStorage.read(file.accessKey!);
		readable.on('error', commonReadableHandlerGenerator(ctx));
		sendNormal(ctx, readable, file.type, file.name);
	}
}

async function sendNormal(ctx: Koa.Context, body: Buffer | stream.Stream, contentType: string, filename?: string): Promise<void> {
	if (contentType === 'application/octet-stream') {
		ctx.vary('Accept');
		ctx.set('Cache-Control', 'private, max-age=0, must-revalidate');

		if (ctx.header['accept']?.match(/activity\+json|ld\+json/)) {
			ctx.status = 400;	// 微妙に406ではない
			return;
		}
	} else {
		ctx.set('Cache-Control', 'max-age=2592000, s-maxage=172800, immutable');
	}

	ctx.body = body;
	ctx.set('Content-Type', contentType);
	if (filename) ctx.set('Content-Disposition', contentDisposition('inline', filename));
}
