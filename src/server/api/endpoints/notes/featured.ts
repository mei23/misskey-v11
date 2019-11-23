import $ from 'cafy';
import Note from '../../../../models/note';
import { packMany } from '../../../../models/note';
import define from '../../define';
import { getHideUserIds } from '../../common/get-hide-users';

export const meta = {
	desc: {
		'ja-JP': 'Featuredな投稿を取得します。',
		'en-US': 'Get featured notes.'
	},

	tags: ['notes'],

	requireCredential: false,

	params: {
		days: {
			validator: $.optional.num.range(0, 1000),
			default: 2,
			desc: {
				'ja-JP': '集計期間 (日)'
			}
		},
		limit: {
			validator: $.optional.num.range(1, 30),
			default: 10,
			desc: {
				'ja-JP': '最大数'
			}
		},
		fileType: {
			validator: $.optional.arr($.str),
			desc: {
				'ja-JP': '指定された種類のファイルが添付された投稿のみを取得します'
			}
		},
		excludeNsfw: {
			validator: $.optional.bool,
			default: false,
			desc: {
				'ja-JP': 'true にするとNSFWを除外します'
			}
		},
		excludeSfw: {
			validator: $.optional.bool,
			default: false,
			desc: {
				'ja-JP': 'NSFWのみ'
			}
		},
		includeGlobal: {
			validator: $.optional.bool,
			default: false,
			desc: {
				'ja-JP': 'true にすると連合を含めます'
			}
		},
	},

	res: {
		type: 'array',
		items: {
			type: 'Note',
		},
	},
};

export default define(meta, async (ps, user) => {
	const day = 1000 * 60 * 60 * 24 * ps.days;

	const hideUserIds = await getHideUserIds(user, true);

	const query = {
		createdAt: {
			$gt: new Date(Date.now() - day)
		},
		deletedAt: null,
		visibility: 'public',
		...(hideUserIds && hideUserIds.length > 0 ? { userId: { $nin: hideUserIds } } : {})
	} as any;

	if (!ps.includeGlobal) {
		query['_user.host'] = null;
	}

	if (ps.excludeNsfw) {
		query['_files.metadata.isSensitive'] = {
			$ne: true
		};
		query['cw'] = null;
	}

	if (ps.excludeSfw) {
		query['_files.metadata.isSensitive'] = true;
	}

	if (ps.fileType) {
		query.fileIds = { $exists: true, $ne: [] };

		query['_files.contentType'] = {
			$in: ps.fileType
		};
	}

	const notes = await Note.find(query, {
		limit: ps.limit,
		sort: {
			score: -1
		},
		hint: {
			score: -1
		}
	});

	return await packMany(notes, user);
});
