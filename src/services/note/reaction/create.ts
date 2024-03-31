import { publishNoteStream } from '../../stream';
import watch from '../watch';
import { renderLike } from '../../../remote/activitypub/renderer/like';
import DeliverManager from '../../../remote/activitypub/deliver-manager';
import { renderActivity } from '../../../remote/activitypub/renderer';
import { toDbReaction, decodeReaction } from '../../../misc/reaction-lib';
import { User, IRemoteUser } from '../../../models/entities/user';
import { Note } from '../../../models/entities/note';
import { NoteReactions, Users, NoteWatchings, Notes, UserProfiles, Emojis } from '../../../models';
import { Not } from 'typeorm';
import { perUserReactionsChart } from '../../chart';
import { genId } from '../../../misc/gen-id';
import { createNotification } from '../../create-notification';
import deleteReaction from './delete';
import { NoteReaction } from '../../../models/entities/note-reaction';
import { isDuplicateKeyValueError } from '../../../misc/is-duplicate-key-value-error';
import { IdentifiableError } from '../../../misc/identifiable-error';

export default async (user: User, note: Note, reaction?: string) => {
	reaction = await toDbReaction(reaction, user.host);

	const inserted: NoteReaction = {
		id: genId(),
		createdAt: new Date(),
		noteId: note.id,
		userId: user.id,
		reaction,
	};

	// Create reaction
	try {
		await NoteReactions.insert(inserted);
	} catch (e) {
		if (isDuplicateKeyValueError(e)) {
			const exists = await NoteReactions.findOneOrFail({
				noteId: note.id,
				userId: user.id,
			});

			if (exists.reaction !== reaction) {
				// 別のリアクションがすでにされていたら置き換える
				await deleteReaction(user, note);
				await NoteReactions.insert(inserted);
			} else {
				// 同じリアクションがすでにされていたらエラー
				throw new IdentifiableError('51c42bb4-931a-456b-bff7-e5a8a70dd298');
			}
		} else {
			throw e;
		}
	}


	// Increment reactions count
	const sql = `jsonb_set("reactions", '{${reaction}}', (COALESCE("reactions"->>'${reaction}', '0')::int + 1)::text::jsonb)`;
	await Notes.createQueryBuilder().update()
		.set({
			reactions: () => sql,
		})
		.where('id = :id', { id: note.id })
		.execute();

	Notes.increment({ id: note.id }, 'score', 1);

	perUserReactionsChart.update(user, note);

	// カスタム絵文字リアクションだったら絵文字情報も送る
	const decodedReaction = decodeReaction(reaction);

	let emoji = await Emojis.findOne({
		where: {
			name: decodedReaction.name,
			host: decodedReaction.host
		},
		select: ['name', 'host', 'url']
	});

	if (emoji) {
		emoji = {
			name: emoji.host ? `${emoji.name}@${emoji.host}` : `${emoji.name}@.`,
			url: emoji.url
		} as any;
	}

	publishNoteStream(note.id, 'reacted', {
		reaction: decodedReaction.reaction,
		emoji: emoji,
		userId: user.id
	});

	// リアクションされたユーザーがローカルユーザーなら通知を作成
	if (note.userHost === null) {
		createNotification(note.userId, user.id, 'reaction', {
			noteId: note.id,
			reaction: reaction
		});
	}

	// Fetch watchers
	NoteWatchings.find({
		noteId: note.id,
		userId: Not(user.id)
	}).then(watchers => {
		for (const watcher of watchers) {
			createNotification(watcher.userId, user.id, 'reaction', {
				noteId: note.id,
				reaction: reaction
			});
		}
	});

	const profile = await UserProfiles.findOne({ userId: user.id });

	// ユーザーがローカルユーザーかつ自動ウォッチ設定がオンならばこの投稿をWatchする
	if (Users.isLocalUser(user) && profile!.autoWatch) {
		watch(user.id, note);
	}

	//#region 配信
	if (Users.isLocalUser(user) && !note.localOnly) {
		const content = renderActivity(await renderLike(inserted, note));
		const dm = new DeliverManager(user, content);
		if (note.userHost !== null) {
			const reactee = await Users.findOne({ id: note.userId });
			dm.addDirectRecipe(reactee as IRemoteUser);
		}
		dm.addFollowersRecipe();
		dm.execute();
	}
	//#endregion
};
