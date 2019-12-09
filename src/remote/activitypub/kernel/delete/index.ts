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

	if (['Note', 'Question', 'Article', 'Audio', 'Document', 'Image', 'Page', 'Video'].includes(formarType)) {
		await deleteNote(actor, uri);
	} else if (['Person', 'Service'].includes(formarType)) {
		apLogger.warn(`Delete Actor is not implanted 1`);
	} else if (formarType == null && uri === actor.uri) {
		apLogger.warn(`Delete Actor is not implanted 2`);
	} else if (formarType == null) {
		await deleteNote(actor, uri);
	} else {
		apLogger.warn(`Unsupported target object type in Delete activity: ${formarType}`);
	}
	//  || formarType == null
};
