import Resolver from '../../resolver';
import { IRemoteUser } from '../../../../models/user';
import createNote from './note';
import { ICreate, getApId, isPost } from '../../type';
import { apLogger } from '../../logger';

const logger = apLogger;

export default async (actor: IRemoteUser, activity: ICreate): Promise<string> => {
	const uri = getApId(activity);

	logger.info(`Create: ${uri}`);

	const resolver = new Resolver();

	let object;

	try {
		object = await resolver.resolve(activity.object);
	} catch (e) {
		logger.error(`Resolution failed: ${e}`);
		throw e;
	}

	if (isPost(object)) {
		return await createNote(resolver, actor, object, false, activity);
	} else {
		return `Unknown type: ${object.type}`;
	}
};
