import $ from 'cafy';
import { ID } from '../../../../misc/cafy-id';
import define from '../../define';
import { createImportBlockingJob } from '../../../../queue';
import ms = require('ms');
import { ApiError } from '../../error';
import { DriveFiles } from '../../../../models';

export const meta = {
	secure: true,
	requireCredential: true,
	limit: {
		duration: ms('1hour'),
		max: 1,
	},

	params: {
		fileId: {
			validator: $.type(ID),
		}
	},

	errors: {
		noSuchFile: {
			message: 'No such file.',
			code: 'NO_SUCH_FILE',
			id: '91235249-f185-43a4-bbdd-3d77d21cc989'
		},

		unexpectedFileType: {
			message: 'We need csv file.',
			code: 'UNEXPECTED_FILE_TYPE',
			id: '2ae6ec7e-14ba-4f94-aaab-53f5593796b5'
		},

		tooBigFile: {
			message: 'That file is too big.',
			code: 'TOO_BIG_FILE',
			id: 'a8ac0052-c404-4561-ab05-86b0b5e52c65'
		},

		emptyFile: {
			message: 'That file is empty.',
			code: 'EMPTY_FILE',
			id: 'd650cf08-e9b9-4e3e-a337-7e0598c7b7d3'
		},
	}
};

export default define(meta, async (ps, user) => {
	const file = await DriveFiles.findOne({ id: ps.fileId });

	if (file == null) throw new ApiError(meta.errors.noSuchFile);
	//if (!file.type.endsWith('/csv')) throw new ApiError(meta.errors.unexpectedFileType);
	if (file.size > 50000) throw new ApiError(meta.errors.tooBigFile);
	if (file.size === 0) throw new ApiError(meta.errors.emptyFile);

	createImportBlockingJob(user, file.id);
});
