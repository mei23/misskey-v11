import * as mongo from 'mongodb';
import User, { IRemoteUser } from '../../../../models/user';
import config from '../../../../config';
import { IBlock } from '../../type';
import unblock from '../../../../services/blocking/delete';
import { apLogger } from '../../logger';

const logger = apLogger;

export default async (actor: IRemoteUser, activity: IBlock): Promise<string> => {
	const id = typeof activity.object == 'string' ? activity.object : activity.object.id;

	const uri = activity.id || activity;

	logger.info(`UnBlock: ${uri}`);

	if (!id.startsWith(config.url + '/')) {
		return `skip: invalid target`;
	}

	const blockee = await User.findOne({
		_id: new mongo.ObjectID(id.split('/').pop())
	});

	if (blockee === null) {
		return `skip: blockee not found`;
	}

	if (blockee.host != null) {
		return `skip: ブロック解除しようとしているユーザーはローカルユーザーではありません`;
	}

	await unblock(actor, blockee);
	return `ok`;
};
