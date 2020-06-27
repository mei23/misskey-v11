// node gen-mecab-index 日数 [global]
// でローカルの過去投稿の検索インデックスを作成する
import Note from '../models/note';
import { genMeid7 } from '../misc/id/meid7';
import { getIndexer } from '../misc/mecab';
import { ObjectID } from 'mongodb';

async function main(days: number, global = false) {
	const limit = new Date(Date.now() - (days * 1000 * 86400));
	const id = new ObjectID(genMeid7(limit));

	while (true) {

		let q: any;

		if (global) {
			q = {
				_id: { $gt: id },
				mecabWords: { $exists: false }
			};
		} else {
			q = {
				'_user.host': null,
				_id: { $gt: id },
				mecabWords: { $exists: false }
			};
		}

		const note = await Note.findOne(q);

		if (!note) {
			console.log('no more Notes');
			break;
		}

		console.log(note._id);

		const mecabWords = await getIndexer(note);

		console.log(JSON.stringify(mecabWords, null, 2));

		await Note.findOneAndUpdate({ _id: note._id }, {
			$set: { mecabWords }
		});
	}
}

const args = process.argv.slice(2);

main(Number(args[0] || '1'), args[1] === 'global').then(() => {
	console.log('Done');
});
