import { oidIncludes } from '../prelude/oid';

/**
 * 対象のNoteをミュートする必要があるか
 * @param note 対象のPackedNote
 * @param mutedUserIds ミュートしているユーザーID
 * @param hideFromUsers Hide指定のあるユーザーID
 * @param hideFromHosts Hide指定のあるホスト
 */
export default function(note: any, mutedUserIds: string[], hideFromUsers?: string[], hideFromHosts?: string[]): boolean {
	// ミュートしているユーザーの投稿
	if (oidIncludes(mutedUserIds, note.userId)) {
		return true;
	}

	// ミュートしているユーザーへのリプライ
	if (note.reply != null && oidIncludes(mutedUserIds, note.reply.userId)) {
		return true;
	}

	// ミュートしているユーザーへのRenote/Quote
	if (note.renote != null && oidIncludes(mutedUserIds, note.renote.userId)) {
		return true;
	}

	// Hide指定のユーザー
	if (hideFromUsers && oidIncludes(hideFromUsers, note.userId)) {
		return true;
	}

	// Hide指定のホスト
	if (hideFromHosts && hideFromHosts.includes(note.user.host)) {
		return true;
	}

	return false;
}
