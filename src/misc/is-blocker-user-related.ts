export function isBlockerUserRelated(note: any, blockerUserIds: string[]): boolean {
	if (blockerUserIds.includes(note.userId)) {
		return true;
	}

	if (note.reply != null && blockerUserIds.includes(note.reply.userId)) {
		return true;
	}

	if (note.renote != null && blockerUserIds.includes(note.renote.userId)) {
		return true;
	}

	return false;
}
