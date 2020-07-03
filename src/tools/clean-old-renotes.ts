import User from '../models/user';
import Note from '../models/note';
import { ObjectID } from 'mongodb';
import Favorite from '../models/favorite';
import { concat } from '../prelude/array';
import { genMeid7 } from '../misc/id/meid7';

async function main(days = 90) {
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
		});

		if (!user) continue;

		console.log(`user(${prs}/${users.length}): ${user.username}@${user.host}`);

		const exIds = concat([
			favs.map(x => x.noteId),
			(user.pinnedNoteIds || [])
		]);

		const notes = await Note.find({
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
					renoteId: { $ne: null },
				},
			],
		});

		for (const note of notes) {
			//#region Renote/Quote先がローカルならスキップ
			const target = await User.findOne({
				_id: note._renote?.userId
			});

			if (!target) continue;
			if (target?.host == null) continue;
			//#endregion

			console.log(`Unrenote/Unquote ${note._id}`);

			await Note.update({ _id: note.renoteId }, {
				$inc: {
					renoteCount: -1
				}
			});

			await Note.remove({ _id: note._id });
		}
	}
}

const args = process.argv.slice(2);

main(args[0]).then(() => {
	console.log('Done');
});
