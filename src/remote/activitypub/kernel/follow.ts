import { IRemoteUser, isLocalUser } from '../../../models/user';
import follow from '../../../services/following/create';
import { IFollow } from '../type';
import ApResolver from '../ap-resolver';

export default async (actor: IRemoteUser, activity: IFollow): Promise<string> => {
	const apResolver = new ApResolver();
	const followee = await apResolver.getUserFromApId(activity.object);

	if (followee == null) {
		return `skip: followee not found`;
	}

	if (!isLocalUser(followee)) {
		return `skip: フォローしようとしているユーザーはローカルユーザーではありません`;
	}

	await follow(actor, followee, activity.id);
	return `ok`;
};
