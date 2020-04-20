import { IRemoteUser, isLocalUser } from '../../../models/user';
import follow from '../../../services/following/create';
import { IFollow } from '../type';
import DbResolver from '../db-resolver';

export default async (actor: IRemoteUser, activity: IFollow): Promise<string> => {
	const dbResolver = new DbResolver();
	const followee = await dbResolver.getUserFromApId(activity.object);

	if (followee == null) {
		return `skip: followee not found`;
	}

	if (!isLocalUser(followee)) {
		return `skip: フォローしようとしているユーザーはローカルユーザーではありません`;
	}

	await follow(actor, followee, activity.id);
	return `ok`;
};
