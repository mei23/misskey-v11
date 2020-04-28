import autobind from 'autobind-decorator';
import { pack } from '../../../../models/note';
import shouldMuteThisNote from '../../../../misc/should-mute-this-note';
import Channel from '../channel';
import fetchMeta from '../../../../misc/fetch-meta';
import UserList from '../../../../models/user-list';
import { concat } from '../../../../prelude/array';
import { isSelfHost } from '../../../../misc/convert-host';
import Following from '../../../../models/following';
import { oidEquals, oidIncludes } from '../../../../prelude/oid';
import UserFilter from '../../../../models/user-filter';

export default class extends Channel {
	public readonly chName = 'hybridTimeline';
	public static requireCredential = true;

	private hideFromUsers: string[] = [];
	private hideFromHosts: string[] = [];
	private hideRenoteUsers: string[] = [];
	private followingIds: string[] = [];
	private excludeForeignReply = false;

	@autobind
	public async init(params: any) {
		const meta = await fetchMeta();
		if (meta.disableLocalTimeline) return;

		// Subscribe events
		this.subscriber.on('notesStream', this.onNewNote);

		const followings = await Following.find({
			followerId: this.user._id
		});

		this.followingIds = followings.map(x => `${x.followeeId}`);

		this.excludeForeignReply = !!params?.excludeForeignReply;

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
	private async onNewNote(note: any) {
		if (!(
			(note.user.host == null && note.visibility === 'public') || // local public
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

		if (this.excludeForeignReply && note.replyId) {
			if (!(
				oidIncludes(this.followingIds, note.reply.userId)
				|| oidEquals(this.user._id, note.reply.userId)
				|| oidEquals(this.user._id, note.userId)
			)) return;
		}

		this.send('note', note);
	}

	@autobind
	public dispose() {
		// Unsubscribe events
		this.subscriber.off('notesStream', this.onNewNote);
	}
}
