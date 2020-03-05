import * as mongo from 'mongodb';
import User, { IRemoteUser } from '../../../../models/user';
import config from '../../../../config';
import { IBlock, getApId } from '../../type';
import block from '../../../../services/blocking/create';
import { apLogger } from '../../logger';

const logger = apLogger;

export default async (actor: IRemoteUser, activity: IBlock): Promise<string> => {
	const id = getApId(activity.object);

	const uri = getApId(activity);

	logger.info(`Block: ${uri}`);

	if (!id.startsWith(config.url + '/')) {
		return `skip: blockee is not a local user`;
	}

	const blockee = await User.findOne({
		_id: new mongo.ObjectID(id.split('/').pop())
	});

	if (blockee === null) {
		return `skip: blockee not found`;
	}

	if (blockee.host != null) {
		return `skip: ブロックしようとしているユーザーはローカルユーザーではありません`;
	}

	await block(actor, blockee);
	return `ok`;
};
