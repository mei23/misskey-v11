import autobind from 'autobind-decorator';
import Mute from '../../../../models/mute';
import { pack } from '../../../../models/note';
import shouldMuteThisNote from '../../../../misc/should-mute-this-note';
import Channel from '../channel';
import fetchMeta from '../../../../misc/fetch-meta';
import User from '../../../../models/user';

export default class extends Channel {
	public readonly chName = 'localTimeline';
	public static shouldShare = true;
	public static requireCredential = false;

	private showReplayInPublicTimeline = false;
	private mutedUserIds: string[] = [];

	@autobind
	public async init(params: any) {
		const meta = await fetchMeta();
		if (meta.disableLocalTimeline) {
			return;
		}
		this.showReplayInPublicTimeline = meta.showReplayInPublicTimeline;

		// Subscribe events
		this.subscriber.on('notesStream', this.onNote);

		const mute = this.user ? await Mute.find({ muterId: this.user._id }) : null;
		this.mutedUserIds = mute ? mute.map(m => m.muteeId.toString()) : [];

		const silences = await User.find({
			isSilenced: true,
			_id: { $nin: this.user ? [ this.user._id ] : [] }
		});

		this.mutedUserIds = this.mutedUserIds.concat(silences.map(x => x._id.toString()));
	}

	@autobind
	private async onNote(note: any) {
		if (note.visibility !== 'public') return;
		if (note.user.host != null) return;
		if (!this.showReplayInPublicTimeline && note.replyId) return;

		// Renoteなら再pack
		if (note.renoteId != null) {
			note.renote = await pack(note.renoteId, this.user, {
				detail: true
			});
		}

		// 流れてきたNoteがミュートしているユーザーが関わるものだったら無視する
		if (shouldMuteThisNote(note, this.mutedUserIds)) return;

		this.send('note', note);
	}

	@autobind
	public dispose() {
		// Unsubscribe events
		this.subscriber.off('notesStream', this.onNote);
	}
}
