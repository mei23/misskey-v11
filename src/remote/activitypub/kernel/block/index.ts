import { IRemoteUser, isLocalUser } from '../../../../models/user';
import { IBlock } from '../../type';
import block from '../../../../services/blocking/create';
import DbResolver from '../../db-resolver';

export default async (actor: IRemoteUser, activity: IBlock): Promise<string> => {
	// ※ activity.objectにブロック対象があり、それは存在するローカルユーザーのはず

	const dbResolver = new DbResolver();
	const blockee = await dbResolver.getUserFromApId(activity.object);

	if (blockee == null) {
		return `skip: blockee not found`;
	}

	if (!isLocalUser(blockee)) {
		return `skip: ブロックしようとしているユーザーはローカルユーザーではありません`;
	}

	await block(actor, blockee);
	return `ok`;
};
