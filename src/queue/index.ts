import * as Queue from 'bull';
import * as httpSignature from 'http-signature';

import config from '../config';
import { ILocalUser } from '../models/user';
import { program } from '../argv';

import processDeliver from './processors/deliver';
import processInbox from './processors/inbox';
import processDb from './processors/db';
import { queueLogger } from './logger';
import { IDriveFile } from '../models/drive-file';
import { INote } from '../models/note';
import { getJobInfo } from './get-job-info';

function initializeQueue(name: string) {
	return new Queue(name, config.redis != null ? {
		redis: {
			port: config.redis.port,
			host: config.redis.host,
			password: config.redis.pass,
			db: config.redis.db || 0,
		},
		prefix: config.redis.prefix ? `${config.redis.prefix}:queue` : 'queue'
	} : null);
}

export const deliverQueue = initializeQueue('deliver');
export const inboxQueue = initializeQueue('inbox');
export const dbQueue = initializeQueue('db');

const deliverLogger = queueLogger.createSubLogger('deliver');
const inboxLogger = queueLogger.createSubLogger('inbox');

deliverQueue
	.on('waiting', (jobId) => deliverLogger.debug(`waiting id=${jobId}`))
	.on('active', (job) => deliverLogger.info(`active ${getJobInfo(job, true)} to=${job.data.to}`))
	.on('completed', (job, result) => deliverLogger.info(`completed(${result}) ${getJobInfo(job, true)} to=${job.data.to}`))
	.on('failed', (job, err) => deliverLogger.warn(`failed(${err}) ${getJobInfo(job)} to=${job.data.to}`))
	.on('error', (error) => deliverLogger.error(`error ${error}`))
	.on('stalled', (job) => deliverLogger.warn(`stalled ${getJobInfo(job)} to=${job.data.to}`));

inboxQueue
	.on('waiting', (jobId) => inboxLogger.debug(`waiting id=${jobId}`))
	.on('active', (job) => inboxLogger.info(`active ${getJobInfo(job, true)} activity=${job.data.activity ? job.data.activity.id : 'none'}`))
	.on('completed', (job, result) => inboxLogger.info(`completed(${result}) ${getJobInfo(job, true)} activity=${job.data.activity ? job.data.activity.id : 'none'}`))
	.on('failed', (job, err) => inboxLogger.warn(`failed(${err}) ${getJobInfo(job)} activity=${job.data.activity ? job.data.activity.id : 'none'}`))
	.on('error', (error) => inboxLogger.error(`error ${error}`))
	.on('stalled', (job) => inboxLogger.warn(`stalled ${getJobInfo(job)} activity=${job.data.activity ? job.data.activity.id : 'none'}`));

export function deliver(user: ILocalUser, content: any, to: any, lowSeverity = false) {
	const attempts = lowSeverity ? 2 : 10;

	if (content == null) return null;

	const data = {
		user,
		content,
		to
	};

	return deliverQueue.add(data, {
		attempts,
		backoff: {
			type: 'exponential',
			delay: 57 * 1000
		},
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function inbox(activity: any, signature: httpSignature.IParsedSignature) {
	const data = {
		activity: activity,
		signature
	};

	return inboxQueue.add(data, {
		attempts: 6,
		backoff: {
			type: 'exponential',
			delay: 277 * 1000
		},
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createDeleteNotesJob(user: ILocalUser) {
	return dbQueue.add('deleteNotes', {
		user: user
	}, {
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createDeleteDriveFilesJob(user: ILocalUser) {
	return dbQueue.add('deleteDriveFiles', {
		user: user
	}, {
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createDeleteNoteJob(note: INote, delay: number) {
	return dbQueue.add('deleteNote', {
		noteId: note._id
	}, {
		delay,
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createExportNotesJob(user: ILocalUser) {
	return dbQueue.add('exportNotes', {
		user: user
	}, {
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createExportFollowingJob(user: ILocalUser) {
	return dbQueue.add('exportFollowing', {
		user: user
	}, {
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createExportMuteJob(user: ILocalUser) {
	return dbQueue.add('exportMute', {
		user: user
	}, {
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createExportBlockingJob(user: ILocalUser) {
	return dbQueue.add('exportBlocking', {
		user: user
	}, {
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createExportUserListsJob(user: ILocalUser) {
	return dbQueue.add('exportUserLists', {
		user: user
	}, {
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createImportFollowingJob(user: ILocalUser, fileId: IDriveFile['_id']) {
	return dbQueue.add('importFollowing', {
		user: user,
		fileId: fileId
	}, {
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createImportUserListsJob(user: ILocalUser, fileId: IDriveFile['_id']) {
	return dbQueue.add('importUserLists', {
		user: user,
		fileId: fileId
	}, {
		removeOnComplete: true,
		removeOnFail: true
	});
}

export default function() {
	if (!program.onlyServer) {
		deliverQueue.process(config.deliverJobConcurrency || 128, processDeliver);
		inboxQueue.process(config.inboxJobConcurrency || 16, processInbox);
		processDb(dbQueue);
	}
}

export function destroy() {
	deliverQueue.once('cleaned', (jobs, status) => {
		deliverLogger.succ(`Cleaned ${jobs.length} ${status} jobs`);
	});
	deliverQueue.clean(0, 'delayed');

	inboxQueue.once('cleaned', (jobs, status) => {
		inboxLogger.succ(`Cleaned ${jobs.length} ${status} jobs`);
	});
	inboxQueue.clean(0, 'delayed');
}
