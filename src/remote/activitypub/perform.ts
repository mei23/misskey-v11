import { IActivity } from './type';
import { IRemoteUser } from '../../models/user';
import { performActivity } from './kernel';

export default async (actor: IRemoteUser, activity: IActivity) => {
	return await performActivity(actor, activity);
};
