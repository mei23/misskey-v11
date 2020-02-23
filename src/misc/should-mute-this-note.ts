import { oidIncludes } from '../prelude/oid';

export default function(note: any, mutedUserIds: string[], hideFromUsers?: string[], hideFromHosts?: string[]): boolean {
	if (oidIncludes(mutedUserIds, note.userId)) {
		return true;
	}

	if (note.reply != null && oidIncludes(mutedUserIds, note.reply.userId)) {
		return true;
	}

	if (note.renote != null && oidIncludes(mutedUserIds, note.renote.userId)) {
		return true;
	}

	if (hideFromUsers && oidIncludes(hideFromUsers, note.userId)) {
		return true;
	}

	if (hideFromHosts && oidIncludes(hideFromHosts, note.user.host)) {
		return true;
	}

	return false;
}
