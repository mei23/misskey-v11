import { IRemoteUser, isLocalUser } from '../../../../models/user';
import { IBlock } from '../../type';
import block from '../../../../services/blocking/create';
import ApResolver from '../../ap-resolver';

export default async (actor: IRemoteUser, activity: IBlock): Promise<string> => {
	// ※ activity.objectにブロック対象があり、それは存在するローカルユーザーのはず

	const apResolver = new ApResolver();
	const blockee = await apResolver.getUserFromApId(activity.object);

	if (blockee == null) {
		return `skip: blockee not found`;
	}

	if (!isLocalUser(blockee)) {
		return `skip: ブロックしようとしているユーザーはローカルユーザーではありません`;
	}

	await block(actor, blockee);
	return `ok`;
};
