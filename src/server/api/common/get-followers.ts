import * as mongodb from 'mongodb';
import Following from '../../../models/following';

export const getFollowerIds = async (me: mongodb.ObjectID, includeMe = true) => {
	const followings = await Following
		.find({
			followeeId: me
		}, {
			fields: {
				followerId: true
			}
		});

	const myfollowerIds = followings.map(following => following.followerId);

	if (includeMe) {
		myfollowerIds.push(me);
	}

	return myfollowerIds;
};
