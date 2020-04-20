import { IRemoteUser, isLocalUser } from '../../../../models/user';
import { IBlock } from '../../type';
import unblock from '../../../../services/blocking/delete';
import DbResolver from '../../db-resolver';

export default async (actor: IRemoteUser, activity: IBlock): Promise<string> => {
	const dbResolver = new DbResolver();
	const blockee = await dbResolver.getUserFromApId(activity.object);

	if (blockee == null) {
		return `skip: blockee not found`;
	}

	if (!isLocalUser(blockee)) {
		return `skip: ブロック解除しようとしているユーザーはローカルユーザーではありません`;
	}

	await unblock(actor, blockee);
	return `ok`;
};
