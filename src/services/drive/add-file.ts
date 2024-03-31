import * as fs from 'fs';

import { v4 as uuid } from 'uuid';

import { publishMainStream, publishDriveStream } from '../stream';
import { deleteFile } from './delete-file';
import { fetchMeta } from '../../misc/fetch-meta';
import { generateVideoThumbnail } from './generate-video-thumbnail';
import { driveLogger } from './logger';
import * as sharp from 'sharp';
import { IImage, convertSharpToJpeg, convertSharpToWebp, convertSharpToPng, convertSharpToPngOrJpeg } from './image-processor';
import { contentDisposition } from '../../misc/content-disposition';
import { getFileInfo } from '../../misc/get-file-info';
import { DriveFiles, DriveFolders, Users, Instances, UserProfiles } from '../../models';
import { InternalStorage } from './internal-storage';
import { DriveFile } from '../../models/entities/drive-file';
import { IRemoteUser, User } from '../../models/entities/user';
import { driveChart, perUserDriveChart, instanceChart } from '../chart';
import { genId } from '../../misc/gen-id';
import { isDuplicateKeyValueError } from '../../misc/is-duplicate-key-value-error';
import * as S3 from 'aws-sdk/clients/s3';
import { getS3 } from './s3';

const logger = driveLogger.createSubLogger('register', 'yellow');

/***
 * Save file
 * @param path Path for original
 * @param name Name for original
 * @param type Content-Type for original
 * @param hash Hash for original
 * @param size Size for original
 */
async function save(file: DriveFile, path: string, name: string, type: string, hash: string, size: number): Promise<DriveFile> {
	// thunbnail, webpublic を必要なら生成
	const alts = await generateAlts(path, type, !file.uri).catch(err => {
		if (err === 'ANIMATED') {
			//
		} else {
			logger.error(err);
		}

		return {
			webpublic: null,
			thumbnail: null
		};
	});

	const meta = await fetchMeta();

	if (meta.useObjectStorage) {
		//#region ObjectStorage params
		const ext = getExt(name, type);

		const baseUrl = meta.objectStorageBaseUrl
			|| `${ meta.objectStorageUseSSL ? 'https' : 'http' }://${ meta.objectStorageEndpoint }${ meta.objectStoragePort ? `:${meta.objectStoragePort}` : '' }/${ meta.objectStorageBucket }`;

		// for original
		const key = `${meta.objectStoragePrefix}/${uuid()}${ext}`;
		const url = `${ baseUrl }/${ key }`;

		// for alts
		let webpublicKey: string | null = null;
		let webpublicUrl: string | null = null;
		let thumbnailKey: string | null = null;
		let thumbnailUrl: string | null = null;
		//#endregion

		//#region Uploads
		logger.info(`uploading original: ${key}`);
		const uploads = [
			upload(key, fs.createReadStream(path), type, name)
		];

		if (alts.webpublic) {
			webpublicKey = `${meta.objectStoragePrefix}/webpublic-${uuid()}.${alts.webpublic.ext}`;
			webpublicUrl = `${ baseUrl }/${ webpublicKey }`;

			logger.info(`uploading webpublic: ${webpublicKey}`);
			uploads.push(upload(webpublicKey, alts.webpublic.data, alts.webpublic.type, name));
		}

		if (alts.thumbnail) {
			thumbnailKey = `${meta.objectStoragePrefix}/thumbnail-${uuid()}.${alts.thumbnail.ext}`;
			thumbnailUrl = `${ baseUrl }/${ thumbnailKey }`;

			logger.info(`uploading thumbnail: ${thumbnailKey}`);
			uploads.push(upload(thumbnailKey, alts.thumbnail.data, alts.thumbnail.type));
		}

		await Promise.all(uploads);
		//#endregion

		file.url = url;
		file.thumbnailUrl = thumbnailUrl;
		file.webpublicUrl = webpublicUrl;
		file.accessKey = key;
		file.thumbnailAccessKey = thumbnailKey;
		file.webpublicAccessKey = webpublicKey;
		file.name = name;
		file.type = type;
		file.md5 = hash;
		file.size = size;
		file.storedInternal = false;

		return await DriveFiles.save(file);
	} else { // use internal storage
		const accessKey = uuid();
		const thumbnailAccessKey = 'thumbnail-' + uuid();
		const webpublicAccessKey = 'webpublic-' + uuid();

		let url = await InternalStorage.saveFromPathAsync(accessKey, path);
		url += `/${accessKey}${getExt(name, type)}`;

		let thumbnailUrl: string | null = null;
		let webpublicUrl: string | null = null;

		if (alts.thumbnail) {
			thumbnailUrl = await InternalStorage.saveFromBufferAsync(thumbnailAccessKey, alts.thumbnail.data);
			thumbnailUrl += `/${thumbnailAccessKey}.jpg`;
			logger.info(`thumbnail stored: ${thumbnailAccessKey}`);
		}

		if (alts.webpublic) {
			webpublicUrl = await InternalStorage.saveFromBufferAsync(webpublicAccessKey, alts.webpublic.data);
			webpublicUrl += `/${webpublicAccessKey}${getExt(name, type)}`;
			logger.info(`web stored: ${webpublicAccessKey}`);
		}

		file.storedInternal = true;
		file.url = url;
		file.thumbnailUrl = thumbnailUrl;
		file.webpublicUrl = webpublicUrl;
		file.accessKey = accessKey;
		file.thumbnailAccessKey = thumbnailAccessKey;
		file.webpublicAccessKey = webpublicAccessKey;
		file.name = name;
		file.type = type;
		file.md5 = hash;
		file.size = size;

		return await DriveFiles.save(file);
	}
}

/**
 * Generate webpublic, thumbnail, etc
 * @param path Path for original
 * @param type Content-Type for original
 * @param generateWeb Generate webpublic or not
 */
 export async function generateAlts(path: string, type: string, generateWeb: boolean) {
	// video
	if (type.startsWith('video/')) {
		const thumbnail = await generateVideoThumbnail(path);
		return {
			webpublic: null,
			thumbnail,
		};
	}

	// unsupported image
	if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(type)) {
		return {
			webpublic: null,
			thumbnail: null
		};
	}

	const img = sharp(path);
	const metadata = await img.metadata();
	const isAnimated = metadata.pages && metadata.pages > 1;

	// skip animated
	if (isAnimated) {
		throw 'ANIMATED';
	}

	// #region webpublic
	let webpublic: IImage | null = null;

	const webpulicSafe = !metadata.exif && !metadata.iptc && !metadata.xmp && !metadata.tifftagPhotoshop	// has meta
		&& metadata.width && metadata.width <= 2048 && metadata.height && metadata.height <= 2048;	// or over 2048

	if (generateWeb) {
		logger.debug(`creating web image`);

		if (['image/jpeg'].includes(type) && !webpulicSafe) { 
			// MozJPEGルーチンを使用する (このあたりのサイズだとWebPより強い)
			webpublic = await convertSharpToJpeg(img, 2048, 2048, { useMozjpeg: true });
		} else if (['image/webp'].includes(type) && !webpulicSafe) {
			webpublic = await convertSharpToWebp(img, 2048, 2048);
		} else if (['image/png'].includes(type) && !webpulicSafe) {
			webpublic = await convertSharpToPng(img, 2048, 2048);
		} else {
			logger.debug(`web image not created (not an image)`);
		}
	} else {
		logger.debug(`web image not created (from remote or resized)`);
	}
	// #endregion webpublic

	// #region thumbnail
	let thumbnail: IImage | null = null;

	if (['image/jpeg', 'image/webp', 'image/avif'].includes(type)) {
		// このあたりのサイズだとWebPの方が強いが互換性のためにとりあえず保留
		thumbnail = await convertSharpToJpeg(img, 498, 280);
	} else if (['image/png', 'image/svg+xml'].includes(type)) {
		// このあたりのサイズだとWebPの方が強いが互換性のためにとりあえず保留
		// こっちの方は smartSubsample 使うといいかも
		thumbnail = await convertSharpToPngOrJpeg(img, 498, 280);
	}
	// #endregion thumbnail

	return {
		webpublic,
		thumbnail,
	};
}

/**
 * Upload to ObjectStorage
 */
async function upload(key: string, stream: fs.ReadStream | Buffer, type: string, filename?: string) {
	if (type === 'image/apng') type = 'image/png';

	const meta = await fetchMeta();

	const params = {
		Bucket: meta.objectStorageBucket,
		Key: key,
		Body: stream,
		ContentType: type,
		CacheControl: 'max-age=31536000, immutable',
	} as S3.PutObjectRequest;

	if (filename) params.ContentDisposition = contentDisposition('inline', filename);
	if (meta.objectStorageSetPublicRead) params.ACL = 'public-read';

	const s3 = getS3(meta);

	const upload = s3.upload(params, {
		partSize: s3.endpoint?.hostname === 'storage.googleapis.com' ? 500 * 1024 * 1024 : 8 * 1024 * 1024
	});

	const result = await upload.promise();
	if (result) logger.debug(`Uploaded: ${result.Bucket}/${result.Key} => ${result.Location}`);
}

async function deleteOldFile(user: IRemoteUser) {
	const q = DriveFiles.createQueryBuilder('file')
		.where('file.userId = :userId', { userId: user.id })
		.andWhere('file.isLink = FALSE');

	if (user.avatarId) {
		q.andWhere('file.id != :avatarId', { avatarId: user.avatarId });
	}

	if (user.bannerId) {
		q.andWhere('file.id != :bannerId', { bannerId: user.bannerId });
	}

	q.orderBy('file.id', 'ASC');

	const oldFile = await q.getOne();

	if (oldFile) {
		deleteFile(oldFile, true);
	}
}

function getExt(name?: string, type?: string) {
	let ext = '';

	if (name) {
		[ext] = (name.match(/\.([a-zA-Z0-9_-]+)$/) || ['']);
	}

	if (ext === '') {
		if (type === 'image/jpeg') ext = '.jpg';
		if (type === 'image/png') ext = '.png';
		if (type === 'image/webp') ext = '.webp';
		if (type === 'image/apng') ext = '.apng';
		if (type === 'image/vnd.mozilla.apng') ext = '.apng';
		if (type === 'video/mp4') ext = '.mp4';
	}

	return ext;
}

/**
 * Add file to drive
 *
 * @param user User who wish to add file
 * @param path File path
 * @param name Name
 * @param comment Comment
 * @param folderId Folder ID
 * @param force If set to true, forcibly upload the file even if there is a file with the same hash.
 * @param isLink Do not save file to local
 * @param url URL of source (URLからアップロードされた場合(ローカル/リモート)の元URL)
 * @param uri URL of source (リモートインスタンスのURLからアップロードされた場合の元URL)
 * @param sensitive Mark file as sensitive
 * @return Created drive file
 */
export default async function(
	user: User,
	path: string,
	name: string | null = null,
	comment: string | null = null,
	folderId: any = null,
	force: boolean = false,
	isLink: boolean = false,
	url: string | null = null,
	uri: string | null = null,
	sensitive: boolean | null = null
): Promise<DriveFile> {
	const info = await getFileInfo(path);
	logger.info(`${JSON.stringify(info)}`);

	// detect name
	const detectedName = name || (info.type.ext ? `untitled.${info.type.ext}` : 'untitled');

	if (!force) {
		// Check if there is a file with the same hash
		const much = await DriveFiles.findOne({
			md5: info.md5,
			userId: user.id,
		});

		if (much) {
			logger.info(`file with same hash is found: ${much.id}`);

			// ファイルに後からsensitiveが付けられたらフラグを上書き
			if (sensitive && !much.isSensitive) {
				await DriveFiles.update({
					id: much.id
				}, {
					isSensitive: sensitive
				});

				return await DriveFiles.findOneOrFail({ id: much.id });
			} else {
				return much;
			}
		}
	}

	//#region Check drive usage
	if (!isLink) {
		const usage = await DriveFiles.clacDriveUsageOf(user);

		const instance = await fetchMeta();
		const driveCapacity = 1024 * 1024 * (Users.isLocalUser(user) ? instance.localDriveCapacityMb : instance.remoteDriveCapacityMb);

		logger.debug(`drive usage is ${usage} (max: ${driveCapacity})`);

		// If usage limit exceeded
		if (usage + info.size > driveCapacity) {
			if (Users.isLocalUser(user)) {
				throw new Error('no-free-space');
			} else {
				// (アバターまたはバナーを含まず)最も古いファイルを削除する
				deleteOldFile(user as IRemoteUser);
			}
		}
	}
	//#endregion

	const fetchFolder = async () => {
		if (!folderId) {
			return null;
		}

		const driveFolder = await DriveFolders.findOne({
			id: folderId,
			userId: user.id
		});

		if (driveFolder == null) throw new Error('folder-not-found');

		return driveFolder;
	};

	const properties: {
		width?: number;
		height?: number;
	} = {};

	if (info.width) {
		properties['width'] = info.width;
		properties['height'] = info.height;
	}

	const profile = await UserProfiles.findOne({ userId: user.id });

	const folder = await fetchFolder();

	let file = new DriveFile();
	file.id = genId();
	file.createdAt = new Date();
	file.userId = user.id;
	file.userHost = user.host;
	file.folderId = folder !== null ? folder.id : null;
	file.comment = comment;
	file.properties = properties;
	file.blurhash = info.blurhash || null;
	file.isLink = isLink;
	file.isSensitive = Users.isLocalUser(user) && profile!.alwaysMarkNsfw ? true :
		(sensitive !== null && sensitive !== undefined)
			? sensitive
			: false;

	if (url !== null) {
		file.src = url;

		if (isLink) {
			file.url = url;
			// ローカルプロキシ用
			file.accessKey = uuid();
			file.thumbnailAccessKey = 'thumbnail-' + uuid();
			file.webpublicAccessKey = 'webpublic-' + uuid();
		}
	}

	if (uri !== null) {
		file.uri = uri;
	}

	if (isLink) {
		try {
			file.size = 0;
			file.md5 = info.md5;
			file.name = detectedName;
			file.type = info.type.mime;
			file.storedInternal = false;

			file = await DriveFiles.save(file);
		} catch (e) {
			// duplicate key error (when already registered)
			if (isDuplicateKeyValueError(e)) {
				logger.info(`already registered ${file.uri}`);

				file = await DriveFiles.findOne({
					uri: file.uri,
					userId: user.id
				}) as DriveFile;
			} else {
				logger.error(e);
				throw e;
			}
		}
	} else {
		file = await (save(file, path, detectedName, info.type.mime, info.md5, info.size));
	}

	logger.succ(`drive file has been created ${file.id}`);

	DriveFiles.pack(file, { self: true }).then(packedFile => {
		// Publish driveFileCreated event
		publishMainStream(user.id, 'driveFileCreated', packedFile);
		publishDriveStream(user.id, 'fileCreated', packedFile);
	});

	// 統計を更新
	driveChart.update(file, true);
	perUserDriveChart.update(file, true);
	if (file.userHost !== null) {
		instanceChart.updateDrive(file, true);
		Instances.increment({ host: file.userHost }, 'driveUsage', file.size);
		Instances.increment({ host: file.userHost }, 'driveFiles', 1);
	}

	return file;
}
