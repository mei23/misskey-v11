import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import Note from '../../../../models/note';
import { getFriends } from '../../common/get-friends';
import { packMany } from '../../../../models/note';
import define from '../../define';
import fetchMeta from '../../../../misc/fetch-meta';
import activeUsersChart from '../../../../services/chart/active-users';
import { getHideUserIds } from '../../common/get-hide-users';
import { ApiError } from '../../error';
import UserList from '../../../../models/user-list';
import { concat } from '../../../../prelude/array';
import { isSelfHost } from '../../../../misc/convert-host';

export const meta = {
	desc: {
		'ja-JP': 'ハイブリッドタイムラインを取得します。'
	},

	tags: ['notes'],

	params: {
		limit: {
			validator: $.optional.num.range(1, 100),
			default: 10,
			desc: {
				'ja-JP': '最大数'
			}
		},

		sinceId: {
			validator: $.optional.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '指定すると、この投稿を基点としてより新しい投稿を取得します'
			}
		},

		untilId: {
			validator: $.optional.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '指定すると、この投稿を基点としてより古い投稿を取得します'
			}
		},

		sinceDate: {
			validator: $.optional.num,
			desc: {
				'ja-JP': '指定した時間を基点としてより新しい投稿を取得します。数値は、1970年1月1日 00:00:00 UTC から指定した日時までの経過時間をミリ秒単位で表します。'
			}
		},

		untilDate: {
			validator: $.optional.num,
			desc: {
				'ja-JP': '指定した時間を基点としてより古い投稿を取得します。数値は、1970年1月1日 00:00:00 UTC から指定した日時までの経過時間をミリ秒単位で表します。'
			}
		},

		includeMyRenotes: {
			validator: $.optional.bool,
			default: true,
			desc: {
				'ja-JP': '自分の行ったRenoteを含めるかどうか'
			}
		},

		includeRenotedMyNotes: {
			validator: $.optional.bool,
			default: true,
			desc: {
				'ja-JP': 'Renoteされた自分の投稿を含めるかどうか'
			}
		},

		includeLocalRenotes: {
			validator: $.optional.bool,
			default: true,
			desc: {
				'ja-JP': 'Renoteされたローカルの投稿を含めるかどうか'
			}
		},

		withFiles: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': 'true にすると、ファイルが添付された投稿だけ取得します'
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
				'ja-JP': 'true にすると、NSFW指定されたファイルを除外します(fileTypeが指定されている場合のみ有効)'
			}
		},

		excludeSfw: {
			validator: $.optional.bool,
			default: false,
			desc: {
				'ja-JP': 'true にすると、NSFW指定されてないファイルを除外します(fileTypeが指定されている場合のみ有効)'
			}
		},

		mediaOnly: {
			validator: $.optional.bool,
			deprecated: true,
			desc: {
				'ja-JP': 'true にすると、ファイルが添付された投稿だけ取得します (このパラメータは廃止予定です。代わりに withFiles を使ってください。)'
			}
		},
	},

	res: {
		type: 'array',
		items: {
			type: 'Note',
		},
	},

	errors: {
		stlDisabled: {
			message: 'Social timeline has been disabled.',
			code: 'STL_DISABLED',
			id: '620763f4-f621-4533-ab33-0577a1a3c342'
		},
	}
};

export default define(meta, async (ps, user) => {
	const m = await fetchMeta();
	if (m.disableLocalTimeline && !user.isAdmin && !user.isModerator) {
		throw new ApiError(meta.errors.stlDisabled);
	}

	const [followings, hideUserIds, hideFromHomeLists] = await Promise.all([
		// フォローを取得
		// Fetch following
		getFriends(user._id, true, false),

		// 隠すユーザーを取得
		getHideUserIds(user, true),

		// Homeから隠すリストを取得
		UserList.find({
			userId: user._id,
			hideFromHome: true,
		})
	]);

	const hideFromHomeUsers = concat(hideFromHomeLists.map(list => list.userIds));
	const hideFromHomeHosts = concat<string>(hideFromHomeLists.map(list => list.hosts || [])).map(x => isSelfHost(x) ? null : x);

	//#region Construct query
	const sort = {
		_id: -1
	};

	const query = {
		$and: [{
			deletedAt: null,

			$or: [{
				visibility: 'public',
				'_user.host': null,
				'_reply.userId': null
			}, {
				visibility: { $in: [ 'public', 'home', 'followers' ] },
				userId: { $in: followings.map(f => f.id) },
				'_reply.userId': null
			}, {
				// myself (for specified/private)
				userId: user._id
			}, {
				// to me (for specified)
				visibleUserIds: { $in: [ user._id ] }
			}, {
				// 自分またはフォローユーザーの投稿へのリプライ
				'_reply.userId': { $in: concat([[ user._id], followings.map(f => f.id)])}
			}, {
				// 自分へのメンションが含まれている
				mentions: { $in: [ user._id ] }
			}],

			// hide
			userId: {
				$nin: hideUserIds.concat(hideFromHomeUsers)
			},
			'_reply.userId': {
				$nin: hideUserIds
			},
			'_renote.userId': {
				$nin: hideUserIds
			},

			'_user.host': {
				$nin: hideFromHomeHosts
			},
		}]
	} as any;

	// MongoDBではトップレベルで否定ができないため、De Morganの法則を利用してクエリします。
	// つまり、「『自分の投稿かつRenote』ではない」を「『自分の投稿ではない』または『Renoteではない』」と表現します。
	// for details: https://en.wikipedia.org/wiki/De_Morgan%27s_laws

	if (ps.includeMyRenotes === false) {
		query.$and.push({
			$or: [{
				userId: { $ne: user._id }
			}, {
				renoteId: null
			}, {
				text: { $ne: null }
			}, {
				fileIds: { $ne: [] }
			}, {
				poll: { $ne: null }
			}]
		});
	}

	if (ps.includeRenotedMyNotes === false) {
		query.$and.push({
			$or: [{
				'_renote.userId': { $ne: user._id }
			}, {
				renoteId: null
			}, {
				text: { $ne: null }
			}, {
				fileIds: { $ne: [] }
			}, {
				poll: { $ne: null }
			}]
		});
	}

	if (ps.includeLocalRenotes === false) {
		query.$and.push({
			$or: [{
				'_renote.user.host': { $ne: null }
			}, {
				renoteId: null
			}, {
				text: { $ne: null }
			}, {
				fileIds: { $ne: [] }
			}, {
				poll: { $ne: null }
			}]
		});
	}

	if (ps.withFiles || ps.mediaOnly) {
		query.$and.push({
			fileIds: { $exists: true, $ne: [] }
		});
	}

	if (ps.fileType) {
		query.fileIds = { $exists: true, $ne: [] };

		query['_files.contentType'] = {
			$in: ps.fileType
		};

		if (ps.excludeNsfw) {
			query['_files.metadata.isSensitive'] = {
				$ne: true
			};
			query['cw'] = null;
		}

		if (ps.excludeSfw) {
			query['_files.metadata.isSensitive'] = true;
		}
	}

	if (ps.sinceId) {
		sort._id = 1;
		query._id = {
			$gt: ps.sinceId
		};
	} else if (ps.untilId) {
		query._id = {
			$lt: ps.untilId
		};
	} else if (ps.sinceDate) {
		sort._id = 1;
		query.createdAt = {
			$gt: new Date(ps.sinceDate)
		};
	} else if (ps.untilDate) {
		query.createdAt = {
			$lt: new Date(ps.untilDate)
		};
	}
	//#endregion

	const timeline = await Note.find(query, {
		limit: ps.limit,
		sort: sort
	});

	activeUsersChart.update(user);

	return await packMany(timeline, user);
});
