import { IRemoteUser, isLocalUser } from '../../../../models/user';
import unfollow from '../../../../services/following/delete';
import cancelRequest from '../../../../services/following/requests/cancel';
import { IFollow } from '../../type';
import FollowRequest from '../../../../models/follow-request';
import Following from '../../../../models/following';
import ApResolver from '../../ap-resolver';

export default async (actor: IRemoteUser, activity: IFollow): Promise<string> => {
	const apResolver = new ApResolver();

	const followee = await apResolver.getUserFromObject(activity.object);
	if (followee == null) {
		return `skip: followee not found`;
	}

	if (!isLocalUser(followee)) {
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
