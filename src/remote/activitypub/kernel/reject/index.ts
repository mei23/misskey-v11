import Resolver from '../../resolver';
import { IRemoteUser } from '../../../../models/user';
import rejectFollow from './follow';
import { IReject, IFollow } from '../../type';
import { apLogger } from '../../logger';

const logger = apLogger;

export default async (actor: IRemoteUser, activity: IReject): Promise<string> => {
	const uri = activity.id || activity;

	logger.info(`Reject: ${uri}`);

	const resolver = new Resolver();

	let object;

	try {
		object = await resolver.resolve(activity.object);
	} catch (e) {
		throw `Resolution failed: ${e}`;
	}

	switch (object.type) {
	case 'Follow':
		return await rejectFollow(actor, object as IFollow);

	default:
		return `skip: Unknown reject type: ${object.type}`;
	}
};
