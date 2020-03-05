import * as mongo from 'mongodb';
import User, { IRemoteUser } from '../../../models/user';
import config from '../../../config';
import follow from '../../../services/following/create';
import { IFollow } from '../type';

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
		return `skip: フォローしようとしているユーザーはローカルユーザーではありません`;
	}

	await follow(actor, followee, activity.id);
	return `ok`;
};
