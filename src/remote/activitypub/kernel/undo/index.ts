import { IRemoteUser } from '../../../../models/user';
import { IUndo, IFollow, IBlock, ILike, IAnnounce } from '../../type';
import unfollow from './follow';
import unblock from './block';
import undoLike from './like';
import Resolver from '../../resolver';
import { apLogger } from '../../logger';
import { undoAnnounce } from './announce';

const logger = apLogger;

export default async (actor: IRemoteUser, activity: IUndo): Promise<string> => {
	if ('actor' in activity && actor.uri !== activity.actor) {
		return `skip: invalid actor`;
	}

	const uri = activity.id || activity;

	logger.info(`Undo: ${uri}`);

	const resolver = new Resolver();

	let object;

	try {
		object = await resolver.resolve(activity.object);
	} catch (e) {
		return `skip: Resolution failed: ${e}`;
	}

	switch (object.type) {
		case 'Follow':
			return await unfollow(actor, object as IFollow);
		case 'Block':
			return await unblock(actor, object as IBlock);
		case 'Like':
		case 'EmojiReaction':
		case 'EmojiReact':
			return await undoLike(actor, object as ILike);
		case 'Announce':
			return await undoAnnounce(actor, object as IAnnounce);
		default:
			return `skip: unknown object type ${object.type}`;
	}
};
