import * as mongo from 'mongodb';
import User, { IRemoteUser } from '../../../../models/user';
import config from '../../../../config';
import unfollow from '../../../../services/following/delete';
import cancelRequest from '../../../../services/following/requests/cancel';
import { IFollow } from '../../type';
import FollowRequest from '../../../../models/follow-request';
import Following from '../../../../models/following';

export default async (actor: IRemoteUser, activity: IFollow): Promise<string> => {
	const id = typeof activity.object == 'string' ? activity.object : activity.object.id;

	if (!id.startsWith(config.url + '/')) {
		return `skip: invalid target`;
	}

	const followee = await User.findOne({
		_id: new mongo.ObjectID(id.split('/').pop())
	});

	if (followee === null) {
		return `skip: followee not found`;
	}

	if (followee.host != null) {
		return `skip: フォロー解除しようとしているユーザーはローカルユーザーではありません`;
	}

	const req = await FollowRequest.findOne({
		followerId: actor._id,
		followeeId: followee._id
	});

	const following = await Following.findOne({
		followerId: actor._id,
		followeeId: followee._id
	});

	if (req) {
		await cancelRequest(followee, actor);
		return `ok: follow request canceled`;
	}

	if (following) {
		await unfollow(actor, followee);
		return `ok: unfollowed`;
	}

	return `skip: リクエストもフォローもされていない`;
};
