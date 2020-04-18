import * as mongo from 'mongodb';
import User, { IRemoteUser } from '../../../../models/user';
import config from '../../../../config';
import reject from '../../../../services/following/requests/reject';
import { IFollow, getApId } from '../../type';

export default async (actor: IRemoteUser, activity: IFollow): Promise<string> => {
	const id = getApId(activity.actor);

	if (!id.startsWith(config.url + '/')) {
		return `skip: reject target is not a local user`;
	}

	const follower = await User.findOne({
		_id: new mongo.ObjectID(id.split('/').pop())
	});

	if (follower == null) {
		return `skip: follower is not found`;
	}

	if (follower.host != null) {
		return `skip: follower is not a local user`;
	}

	await reject(actor, follower);
	return `ok`;
};
