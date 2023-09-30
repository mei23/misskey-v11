import config from '../config';
import { initialize as initializeQueue } from './initialize';
import { DbJobData, DeliverJobData, InboxJobData, ObjectStorageJobData } from './types';

export const deliverQueue = initializeQueue<DeliverJobData>('deliver', config.deliverJobPerSec || -1);
export const inboxQueue = initializeQueue<InboxJobData>('inbox', config.inboxJobPerSec || -1);
export const dbQueue = initializeQueue<DbJobData>('db');
export const objectStorageQueue = initializeQueue<ObjectStorageJobData>('objectStorage');
