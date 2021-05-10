import * as Bull from 'bull';
import { deleteObjectStorageFile } from '../../../services/drive/delete-file';
import { DeleteObjectStorageFileJobData } from '../../types';

export default async (job: Bull.Job<DeleteObjectStorageFileJobData>) => {
	const key: string = job.data.key;

	await deleteObjectStorageFile(key);

	return 'Success';
};
