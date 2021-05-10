import * as Bull from 'bull';
import deleteFile from './delete-file';
import cleanRemoteFiles from './clean-remote-files';
import { ObjectStorageJobData } from '../../types';

const jobs = {
	deleteFile,
	cleanRemoteFiles,
} as Record<string, Bull.ProcessCallbackFunction<ObjectStorageJobData> | Bull.ProcessPromiseFunction<ObjectStorageJobData>>;

export default function(q: Bull.Queue) {
	for (const [k, v] of Object.entries(jobs)) {
		q.process(k, 16, v);
	}
}
