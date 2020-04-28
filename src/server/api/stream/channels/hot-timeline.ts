import autobind from 'autobind-decorator';
import { pack } from '../../../../models/note';
import shouldMuteThisNote from '../../../../misc/should-mute-this-note';
import Channel from '../channel';

export default class extends Channel {
	public readonly chName = 'hotTimeline';
	public static requireCredential = true;

	@autobind
	public async init(params: any) {
		// Subscribe events
		this.subscriber.on('hotStream', this.onNewNote);
	}

	@autobind
	private async onNewNote(note: any) {
		// reply除外
		if (note.replyId != null) return;

		// Renote除外
		if (note.renoteId && !note.text && !note.fileIds?.length && !note.poll) {	// pure renote
			return;
		}

		// フォロワー限定以下なら現在のユーザー情報で再度除外
		if (['followers', 'specified'].includes(note.visibility)) {
			note = await pack(note.id, this.user, {
				detail: true
			});

			if (note.isHidden) {
				return;
			}
		}

		// 流れてきたNoteがミュートしているユーザーが関わるものだったら無視する
		if (shouldMuteThisNote(note, this.mutedUserIds)) return;

		this.send('note', note);
	}

	@autobind
	public dispose() {
		// Unsubscribe events
		this.subscriber.off('hotStream', this.onNewNote);
	}
}
