import autobind from 'autobind-decorator';
import Mute from '../../../../models/mute';
import { pack } from '../../../../models/note';
import shouldMuteThisNote from '../../../../misc/should-mute-this-note';
import Channel from '../channel';
import fetchMeta from '../../../../misc/fetch-meta';
import UserList from '../../../../models/user-list';
import { concat } from '../../../../prelude/array';
import { isSelfHost } from '../../../../misc/convert-host';
import User from '../../../../models/user';
import Following from '../../../../models/following';

export default class extends Channel {
	public readonly chName = 'hybridTimeline';
	public static shouldShare = true;
	public static requireCredential = true;

	private mutedUserIds: string[] = [];
	private hideFromUsers: string[] = [];
	private hideFromHosts: string[] = [];
	private followingIds: string[] = [];

	@autobind
	public async init(params: any) {
		const meta = await fetchMeta();
		if (meta.disableLocalTimeline && !this.user.isAdmin && !this.user.isModerator) return;

		// Subscribe events
		this.subscriber.on('notesStream', this.onNewNote);

		const followings = await Following.find({
			followerId: this.user._id
		});

		this.followingIds = followings.map(x => `${x.followeeId}`);

		const mute = await Mute.find({ muterId: this.user._id });
		this.mutedUserIds = mute.map(m => m.muteeId.toString());

		const silences = await User.find({
			isSilenced: true,
			_id: { $nin: this.user ? [ this.user._id ] : [] }
		});

		this.mutedUserIds = this.mutedUserIds.concat(silences.map(x => x._id.toString()));

		// Homeから隠すリストユーザー
		const lists = await UserList.find({
			userId: this.user._id,
			hideFromHome: true,
		});

		this.hideFromUsers = concat(lists.map(list => list.userIds)).map(x => x.toString());
		this.hideFromHosts = concat(lists.map(list => list.hosts || [])).map(x => isSelfHost(x) ? null : x);
	}

	@autobind
	private async onNewNote(note: any) {
		// リプライじゃなければリプライ解決するまでもなく除外確定
		if (!note.replyId) {
			if (!(
				(note.user.host == null && note.visibility === 'public') || // local public
				`${note.userId}` === `${this.user._id}` ||	// myself
				this.followingIds.some(x => `${note.userId}` === `${x}`) ||	// followers
				(note.mentions || []).some((x: any) => `${x}` === `${this.user._id}`) ||
				(note.visibleUserIds || []).some((x: any) => `${x}` === `${this.user._id}`)
			)) return;
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

		// リプライの場合リプライ情報を見て再度除外
		try {
			if (note.replyId) {
				if (!(
					(note.user.host == null && note.visibility === 'public') || // local public
					`${note.userId}` === `${this.user._id}` ||	// myself
					this.followingIds.some(x => `${note.userId}` === `${x}`) ||	// followers
					(note.mentions || []).some((x: any) => `${x}` === `${this.user._id}`) ||
					(note.visibleUserIds || []).some((x: any) => `${x}` === `${this.user._id}`)
					`${this.user._id}` === `${note.reply.userId}`
				)) return;
			}
		} catch (e) {
			console.log(JSON.stringify(note, null, 2));
		}

		// 流れてきたNoteがミュートしているユーザーが関わるものだったら無視する
		if (shouldMuteThisNote(note, this.mutedUserIds, this.hideFromUsers, this.hideFromHosts)) return;

		this.send('note', note);
	}

	@autobind
	public dispose() {
		// Unsubscribe events
		this.subscriber.off('notesStream', this.onNewNote);
	}
}
