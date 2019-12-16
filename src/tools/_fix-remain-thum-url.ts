import * as promiseLimit from 'promise-limit';
import DriveFile, { IDriveFile } from '../models/drive-file';

const limit = promiseLimit(1);

DriveFile.find({
	'metadata._user.host': null,
	'metadata.thumbnailUrl': { $regex: /drive\.misskey/ },
}, {
	fields: {
		_id: true
	}
}).then(async files => {
	console.log(`there is ${files.length} files`);

	await Promise.all(files.map(file => limit(() => job(file))));

	console.log('ALL DONE');
});

async function job(file: IDriveFile): Promise<any> {
	file = await DriveFile.findOne({ _id: file._id });
	console.log(`old thumbnailUrl: ${file.metadata.thumbnailUrl}`);

	if (file.metadata.thumbnailUrl != null) {
		if (file.metadata.thumbnailUrl.match('https://drive.misskey.m544.net/')) {
			const newUrl = file.metadata.thumbnailUrl.replace('https://drive.misskey.m544.net/', 'https://misskey-drive.m544.net/');
			console.log(`new thumbnailUrl: ${newUrl}`);

			const res = await DriveFile.update({ _id: file._id }, {
				$set: {
					'metadata.thumbnailUrl': newUrl
				}
			});
			console.log(res);
		}
		console.log('done', file._id);
	}
}
