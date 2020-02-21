import autobind from 'autobind-decorator';
import Mute from '../../../../models/mute';
import { pack } from '../../../../models/note';
import shouldMuteThisNote from '../../../../misc/should-mute-this-note';
import Channel from '../channel';
import { concat } from '../../../../prelude/array';
import UserList from '../../../../models/user-list';
import { isSelfHost } from '../../../../misc/convert-host';
import Following from '../../../../models/following';
import { oidEquals, oidIncludes } from '../../../../prelude/oid';
import UserFilter from '../../../../models/user-filter';

export default class extends Channel {
	public readonly chName = 'homeTimeline';
	public static shouldShare = true;
	public static requireCredential = true;

	private mutedUserIds: string[] = [];
	private hideFromUsers: string[] = [];
	private hideFromHosts: string[] = [];
	private hideRenoteUsers: string[] = [];
	private followingIds: string[] = [];

	@autobind
	public async init(params: any) {
		// Subscribe events
		this.subscriber.on('notesStream', this.onNote);

		const followings = await Following.find({
			followerId: this.user._id
		});

		this.followingIds = followings.map(x => `${x.followeeId}`);

		const mute = await Mute.find({ muterId: this.user._id });
		this.mutedUserIds = mute.map(m => m.muteeId.toString());

		// Homeから隠すリストユーザー
		const lists = await UserList.find({
			userId: this.user._id,
			hideFromHome: true,
		});

		this.hideFromUsers = concat(lists.map(list => list.userIds)).map(x => x.toString());
		this.hideFromHosts = concat(lists.map(list => list.hosts || [])).map(x => isSelfHost(x) ? null : x);

		const hideRenotes = await UserFilter.find({
			ownerId: this.user._id,
			hideRenote: true
		});

		this.hideRenoteUsers = hideRenotes.map(hideRenote => hideRenote.targetId).map(x => x.toString());
	}

	@autobind
	private async onNote(note: any) {
		if (!(
			oidEquals(note.userId, this.user._id) ||	// myself
			oidIncludes(this.followingIds, note.userId)	// from followers
		)) return;

		// フォロワー限定以下なら現在のユーザー情報で再度除外
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
		if (shouldMuteThisNote(note, this.mutedUserIds, this.hideFromUsers, this.hideFromHosts)) return;

		// Renoteを隠すユーザー
		if (note.renoteId && !note.text && !note.fileIds?.length && !note.poll) {	// pure renote
			if (oidIncludes(this.hideRenoteUsers, note.userId)) return;
		}

		this.send('note', note);
	}

	@autobind
	public dispose() {
		// Unsubscribe events
		this.subscriber.off('notesStream', this.onNote);
	}
}
