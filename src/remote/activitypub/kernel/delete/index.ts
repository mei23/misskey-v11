import deleteNote from './note';
import { IRemoteUser } from '../../../../models/user';
import { IDelete, getApId, isTombstone } from '../../type';

/**
 * 削除アクティビティを捌きます
 */
export default async (actor: IRemoteUser, activity: IDelete): Promise<string> => {
	if ('actor' in activity && actor.uri !== activity.actor) {
		throw new Error('invalid actor');
	}

	// 削除対象objectのtype
	let formarType: string | undefined;

	if (typeof activity.object === 'string') {
		// どうせremote resolveしても消えてるので不明なままにしておく
		formarType = undefined;
	} else if (isTombstone(activity.object)) {
		formarType = activity.object.formerType;
	} else {
		formarType = activity.object.type;
	}

	const uri = getApId(activity.object);

	if (['Note', 'Question', 'Article', 'Audio', 'Document', 'Image', 'Page', 'Video'].includes(formarType)) {
		return await deleteNote(actor, uri);
	} else if (['Person', 'Service'].includes(formarType)) {
		return `Delete Actor is not implanted 1`;
	} else if (formarType == null && uri === actor.uri) {
		// formarTypeが不明でも対象がactorと同じならばそれはActorに違いない
		return `Delete Actor is not implanted 2`;
	} else if (formarType == null) {
		// それでもformarTypeが不明だったらおそらくNote
		return await deleteNote(actor, uri);
	} else {
		// 明示的に見知らぬformarTypeだった場合
		return `Unsupported target object type in Delete activity: ${formarType}`;
	}
};
