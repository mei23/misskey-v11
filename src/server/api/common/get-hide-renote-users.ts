import * as mongo from 'mongodb';
import { IUser } from '../../../models/user';
import UserFilter from '../../../models/user-filter';

export async function getHideRenoteUserIds(me?: IUser) {
	return await getHideRenoteUserIdsById(me?._id);
}

export async function getHideRenoteUserIdsById(ownerId?: mongo.ObjectID) {
	if (!ownerId) return [];

	const filters = await UserFilter.find({
		ownerId,
		hideRenote: true,
	});

	return filters.map(x => x.targetId);
}
