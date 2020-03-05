import { IRemoteUser } from '../../../../models/user';
import { IAdd } from '../../type';
import { resolveNote } from '../../models/note';
import { addPinned } from '../../../../services/i/pin';

export default async (actor: IRemoteUser, activity: IAdd): Promise<string> => {
	if ('actor' in activity && actor.uri !== activity.actor) {
		return `skip: invalid actor`;
	}

	if (activity.target == null) {
		return `skip: target is null`;
	}

	if (activity.target === actor.featured) {
		const note = await resolveNote(activity.object);
		await addPinned(actor, note._id);
		return `ok`;
	}

	return `skip: unknown target: ${activity.target}`;
};
