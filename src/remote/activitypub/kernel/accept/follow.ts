import * as mongo from 'mongodb';
import User, { IRemoteUser } from '../../../../models/user';
import config from '../../../../config';
import accept from '../../../../services/following/requests/accept';
import { IFollow, getApId } from '../../type';

export default async (actor: IRemoteUser, activity: IFollow): Promise<string> => {
	const id = getApId(activity.actor);

	if (!id.startsWith(config.url + '/')) {
		return `skip: accept target is no a local user.`;
	}

	const follower = await User.findOne({
		_id: new mongo.ObjectID(id.split('/').pop())
	});

	if (follower == null) {
		return `skip: follower not found`;
	}

	if (follower.host != null) {
		throw new Error('フォローリクエストしたユーザーはローカルユーザーではありません');
	}

	await accept(actor, follower);
	return `ok`;
};
