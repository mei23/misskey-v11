import deleteNote from './note';
import { IRemoteUser } from '../../../../models/user';
import { IDelete, getApId, isTombstone, IObject } from '../../type';
import { toSingle } from '../../../../prelude/array';

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
		// typeが不明だけど、どうせ消えてるのでremote resolveしない
		formarType = undefined;
	} else {
		const object = activity.object as IObject;
		if (isTombstone(object)) {
			formarType = toSingle(object.formerType);
		} else {
			formarType = toSingle(object.type);
		}
	}

	const uri = getApId(activity.object);

	// type不明でもactorとobjectが同じならばそれはPersonに違いない
	if (!formarType && actor.uri === uri) {
		formarType = 'Person';
	}

	// それでもなかったらおそらくNote
	if (!formarType) {
		formarType = 'Note';
	}

	if (['Note', 'Question', 'Article', 'Audio', 'Document', 'Image', 'Page', 'Video'].includes(formarType)) {
		return await deleteNote(actor, uri);
	} else if (['Person', 'Service', 'Organization', 'Group'].includes(formarType)) {
		return `Delete Actor is not implanted`;
	} else {
		return `Unknown type ${formarType}`;
	}
};
