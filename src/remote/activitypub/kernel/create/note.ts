import Resolver from '../../resolver';
import { IRemoteUser } from '../../../../models/user';
import { createNote, fetchNote } from '../../models/note';
import { getApLock } from '../../../../misc/app-lock';
import { IObject, getApId } from '../../type';

/**
 * 投稿作成アクティビティを捌きます
 */
export default async function(resolver: Resolver, actor: IRemoteUser, note: IObject, silent = false): Promise<string> {
	const uri = getApId(note);

	const unlock = await getApLock(uri);

	try {
		const exist = await fetchNote(note);
		if (exist) return 'skip: note exists';

		await createNote(note);
		return 'ok';
	} finally {
		unlock();
	}
}
