import { IRemoteUser } from '../../../models/user';
import { ILike, getApId } from '../type';
import create from '../../../services/note/reaction/create';
import { resolveNote } from '../models/note';

export default async (actor: IRemoteUser, activity: ILike): Promise<string> => {
	const targetUri = getApId(activity.object);

	const note = await resolveNote(targetUri, null, true).catch(() => null);
	if (!note) return `skip: target note not found ${targetUri}`;

	await create(actor, note, activity._misskey_reaction || activity.content || activity.name);
	return `ok`;
};
