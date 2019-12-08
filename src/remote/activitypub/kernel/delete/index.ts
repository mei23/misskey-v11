import deleteNote from './note';
import { IRemoteUser } from '../../../../models/user';
import { IDelete, getApId, isNote, isTombstone } from '../../type';
import { apLogger } from '../../logger';

/**
 * 削除アクティビティを捌きます
 */
export default async (actor: IRemoteUser, activity: IDelete): Promise<void> => {
	if ('actor' in activity && actor.uri !== activity.actor) {
		throw new Error('invalid actor');
	}

	let formarType: string | undefined;

	if (typeof activity.object === 'string') {
		formarType = undefined;
	} else if (isNote(activity.object)) {
		formarType = 'Note';
	} else if (isTombstone(activity.object)) {
		formarType = activity.object.formerType;
	} else {
		apLogger.warn(`Unknown object type in Delete activity: ${activity.type}`);
		return;
	}

	const uri = getApId(activity.object);

	if (formarType === 'Note' || formarType == null) {
		await deleteNote(actor, uri);
	} else {
		apLogger.warn(`Unsupported target object type in Delete activity: ${formarType}`);
	}
};
