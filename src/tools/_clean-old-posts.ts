// 90日以内のFavもリアクションもRenoteもされてないリモート投稿を削除する
import User, { IUser } from '../models/user';
import Note from '../models/note';
import Favorite from '../models/favorite';
import { concat } from '../prelude/array';
import { genMeid7 } from '../misc/id/meid7';
import { ObjectID } from 'mongodb';

async function main(days: number) {
	const limit = new Date(Date.now() - (days * 1000 * 86400));
	const id = new ObjectID(genMeid7(limit));

	// favs
	const favs = await Favorite.find({
		noteId: { $lt: id }
	});

	// remote users
	const users = await User.find({
		host: { $ne: null },
	}, {
		fields: {
			_id: true
		}
	});

	let prs = 0;

	for (const u of users) {
		prs++;

		const user = await User.findOne({
			_id: u._id
		}) as IUser;

		console.log(`user(${prs}/${users.length}): ${user.username}@${user.host}`);

		const exIds = concat([
			favs.map(x => x.noteId),
			(user.pinnedNoteIds || [])
		]);

		const result = await Note.remove({
			$and: [
				{
					userId: user._id
				},

				{
					_id: { $nin: exIds }
				},
				{
					_id: { $lt: id }
				},

				{
					$or: [
						{ renoteCount: { $exists: false } },
						{ renoteCount: 0 },
					],
				},
				{
					repliesCount: { $exists: false }
				},
				{
					reactionCounts: { $exists: false }
				},

				{
					replyId: null,
				},
				{
					renoteId: null,
				},
			],
		});

		console.log(`  deleted count:${result.deletedCount}`);

		/*
		for (const note of notes) {
			//console.log(JSON.stringify(note, null, 2));
			console.log(`${note._id}`);
		}
		*/
	}
}

main(90).then(() => {
	console.log('Done');
});
