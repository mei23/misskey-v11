//import { ObjectID } from 'mongodb';
import * as httpSignature from 'http-signature';
import { ILocalUser, User } from '../models/entities/user';
import { IActivity } from '../remote/activitypub/type';

export type DeliverJobData = {
	/** Actor */
	user: ILocalUser;
	/** Activity */
	content: any;
	/** inbox URL to deliver */
	to: string;
};

export type InboxJobData = {
	activity: IActivity;
	signature: httpSignature.IParsedSignature;
};

export type DbJobData = DbUserJobData | DbUserImportJobData;

export type DbUserJobData = {
	user: User;
};

export type DbUserImportJobData = {
	user: ILocalUser;
	fileId: string;
};

export type ObjectStorageJobData = DeleteObjectStorageFileJobData | CleanRemoteFilesJobData;

export type DeleteObjectStorageFileJobData = {
	key: string;
};

export type CleanRemoteFilesJobData = Record<string, unknown>;
