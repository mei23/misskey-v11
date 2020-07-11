// かなり古いバグで生成されている可能性のあるリモートのNoteUnreadを削除します
import User, { IUser } from '../models/user';
import NoteUnread from '../models/note-unread';

async function main() {
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

		const result = await NoteUnread.remove({
			userId: user._id
		});

		console.log(`  deleted count:${result.deletedCount}`);
	}
}

//const args = process.argv.slice(2);

main().then(() => {
	console.log('Done');
});
