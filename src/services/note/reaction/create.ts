import { IUser, isLocalUser, isRemoteUser } from '../../../models/user';
import Note, { INote } from '../../../models/note';
import NoteReaction from '../../../models/note-reaction';
import { publishNoteStream } from '../../stream';
import notify from '../../create-notification';
import NoteWatching from '../../../models/note-watching';
import watch from '../watch';
import renderLike from '../../../remote/activitypub/renderer/like';
import DeliverManager from '../../../remote/activitypub/deliver-manager';
import { renderActivity } from '../../../remote/activitypub/renderer';
import perUserReactionsChart from '../../../services/chart/per-user-reactions';
import { toDbReaction } from '../../../misc/reaction-lib';
import deleteReaction from './delete';

export default async (user: IUser, note: INote, reaction: string) => {
	reaction = await toDbReaction(reaction);

	// Create reaction
	try {
		await NoteReaction.insert({
			createdAt: new Date(),
			noteId: note._id,
			userId: user._id,
			reaction
		});
	} catch (e) {
		// duplicate key error
		if (e.code === 11000) {
			await deleteReaction(user, note);
			await NoteReaction.insert({
				createdAt: new Date(),
				noteId: note._id,
				userId: user._id,
				reaction
			});
		} else {
			throw e;
		}
	}

	// Increment reactions count
	await Note.update({ _id: note._id }, {
		$inc: {
			[`reactionCounts.${reaction}`]: 1,
			score: 1
		}
	});

	perUserReactionsChart.update(user, note);

	publishNoteStream(note._id, 'reacted', {
		reaction: reaction,
		userId: user._id
	});

	// リアクションされたユーザーがローカルユーザーなら通知を作成
	if (isLocalUser(note._user)) {
		notify(note.userId, user._id, 'reaction', {
			noteId: note._id,
			reaction: reaction
		});
	}

	// Fetch watchers
	NoteWatching
		.find({
			noteId: note._id,
			userId: { $ne: user._id }
		}, {
			fields: {
				userId: true
			}
		})
		.then(watchers => {
			for (const watcher of watchers) {
				notify(watcher.userId, user._id, 'reaction', {
					noteId: note._id,
					reaction: reaction
				});
			}
		});

	// ユーザーがローカルユーザーかつ自動ウォッチ設定がオンならばこの投稿をWatchする
	if (isLocalUser(user) && user.settings.autoWatch !== false) {
		watch(user._id, note);
	}

	//#region 配信
	if (isLocalUser(user) && !note.localOnly && !user.noFederation) {
		const content = renderActivity(renderLike(user, note, reaction));
		const dm = new DeliverManager(user, content);
		if (isRemoteUser(note._user)) dm.addDirectRecipe(note._user);
		dm.addFollowersRecipe();
		dm.execute();
	}
	//#endregion

	return;
};
