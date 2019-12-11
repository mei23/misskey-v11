import autobind from 'autobind-decorator';
import Channel from '../channel';
import { pack } from '../../../../models/note';
import Mute from '../../../../models/mute';
import shouldMuteThisNote from '../../../../misc/should-mute-this-note';
import UserList, { IUserList } from '../../../../models/user-list';
import config from '../../../../config';

export default class extends Channel {
	public readonly chName = 'userList';
	public static shouldShare = false;
	public static requireCredential = false;
	private listId: string;
	public lists: IUserList[] = [];

	private mutedUserIds: string[] = [];

	@autobind
	public async init(params: any) {
		this.listId = params.listId;
		const mute = this.user ? await Mute.find({ muterId: this.user._id }) : null;
		this.mutedUserIds = mute ? mute.map(m => m.muteeId.toString()) : [];

		// Subscribe stream
		this.subscriber.on(`userListStream:${this.listId}`, this.send);
		this.subscriber.on('notesStream', this.onNote);

		this.lists = await UserList.find({
			_id: this.listId
		});
	}

	@autobind
	private async onNote(note: any) {
		if (!(
			this.lists.some(list => list.hosts && list.hosts.includes('*')) ||
			this.lists.some(list => list.userIds.some(userId => `${note.userId}` === `${userId}`)) ||
			this.lists.some(list => list.hosts && list.hosts.includes(note.user.host || config.host))
		)) return;

		if (['followers', 'specified'].includes(note.visibility)) {
			note = await pack(note.id, this.user, {
				detail: true
			});

			if (note.isHidden) {
				return;
			}
		}

		// リプライなら再pack
		if (note.replyId != null) {
			note.reply = await pack(note.replyId, this.user, {
				detail: true
			});
		}
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
		this.subscriber.off(`userListStream:${this.listId}`, this.send);
		this.subscriber.off('notesStream', this.onNote);
	}
}
