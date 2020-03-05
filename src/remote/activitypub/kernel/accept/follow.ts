import * as mongo from 'mongodb';
import User, { IRemoteUser } from '../../../../models/user';
import config from '../../../../config';
import accept from '../../../../services/following/requests/accept';
import { IFollow } from '../../type';

export default async (actor: IRemoteUser, activity: IFollow): Promise<string> => {
	const id = typeof activity.actor == 'string' ? activity.actor : activity.actor.id;

	if (!id.startsWith(config.url + '/')) {
		return null;
	}

	const follower = await User.findOne({
		_id: new mongo.ObjectID(id.split('/').pop())
	});

	if (follower === null) {
		return `skip: follower not found`;
	}

	if (follower.host != null) {
		throw new Error('フォローリクエストしたユーザーはローカルユーザーではありません');
	}

	await accept(actor, follower);
	return `ok`;
};
