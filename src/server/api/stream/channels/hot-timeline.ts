import autobind from 'autobind-decorator';
import Mute from '../../../../models/mute';
import { pack } from '../../../../models/note';
import shouldMuteThisNote from '../../../../misc/should-mute-this-note';
import Channel from '../channel';
import fetchMeta from '../../../../misc/fetch-meta';
import User from '../../../../models/user';

export default class extends Channel {
	public readonly chName = 'hotTimeline';
	public static shouldShare = true;
	public static requireCredential = true;

	private mutedUserIds: string[] = [];

	@autobind
	public async init(params: any) {
		const meta = await fetchMeta();
		if (meta.disableLocalTimeline && !this.user.isAdmin && !this.user.isModerator) return;

		// Subscribe events
		this.subscriber.on('hotStream', this.onNewNote);

		const mute = await Mute.find({ muterId: this.user._id });
		this.mutedUserIds = mute.map(m => m.muteeId.toString());

		const silences = await User.find({
			isSilenced: true,
			_id: { $nin: this.user ? [ this.user._id ] : [] }
		});

		this.mutedUserIds = this.mutedUserIds.concat(silences.map(x => x._id.toString()));
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
