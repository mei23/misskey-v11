import $ from 'cafy';
import * as escapeRegexp from 'escape-regexp';
import User, { pack, validateUsername, IUser } from '../../../../models/user';
import define from '../../define';
import { toDbHost, isSelfHost } from '../../../../misc/convert-host';
import Instance from '../../../../models/instance';
import { concat } from '../../../../prelude/array';

export const meta = {
	desc: {
		'ja-JP': 'ユーザーを検索します。'
	},

	tags: ['users'],

	requireCredential: false,

	params: {
		query: {
			validator: $.str,
			desc: {
				'ja-JP': 'クエリ'
			}
		},

		offset: {
			validator: $.optional.num.min(0),
			default: 0,
			desc: {
				'ja-JP': 'オフセット'
			}
		},

		limit: {
			validator: $.optional.num.range(1, 100),
			default: 10,
			desc: {
				'ja-JP': '取得する数'
			}
		},

		localOnly: {
			validator: $.optional.bool,
			default: false,
			desc: {
				'ja-JP': 'ローカルユーザーのみ検索対象にするか否か'
			}
		},

		detail: {
			validator: $.optional.bool,
			default: true,
			desc: {
				'ja-JP': '詳細なユーザー情報を含めるか否か'
			}
		},
	},

	res: {
		type: 'array',
		items: {
			type: 'User',
		}
	},
};

export default define(meta, async (ps, me) => {
	const isName = ps.query.replace('@', '').match(/^[\W-]/) != null;
	const isUsername = validateUsername(ps.query.replace('@', ''), !ps.localOnly);
	const isHostname = ps.query.replace('@', '').match(/\./) != null;

	let users: IUser[] = [];

	// 隠すインスタンス
	const hideInstances = await Instance.find({
		$or: [
			{ isMarkedAsClosed: true },
			{ isBlocked: true }
		]
	}, {
		fields: {
			host: true
		}
	});

	// 隠すホスト
	const hideHosts = hideInstances.map(x => toDbHost(x.host));
	const hideHostsForRemote = concat([hideHosts, [null]]);

	// 表示名
	if (isName) {
		const name = ps.query.replace(/^-/, '');

		// local
		users = await User
			.find({
				host: null,
				name: new RegExp('^' + escapeRegexp(name), 'i'),
				isSuspended: { $ne: true }
			}, {
				limit: ps.limit,
				skip: ps.offset
			});

		if (users.length < ps.limit && !ps.localOnly) {
			// try remote
			const otherUsers = await User
				.find({
					host: { $nin: hideHostsForRemote },
					name: new RegExp('^' + escapeRegexp(name), 'i'),
					isSuspended: { $ne: true }
				}, {
					limit: ps.limit - users.length
				});

			users = users.concat(otherUsers);
		}
	// ユーザー名
	} else if (isUsername) {
		// まず、username (local/remote) の完全一致でアクティブ順
		if (users.length < ps.limit && !ps.localOnly) {
			users = await User
				.find({
						host: { $nin: hideHosts },
						usernameLower: ps.query.replace('@', '').toLowerCase(),
						isSuspended: { $ne: true }
					}, {
						limit: ps.limit - users.length,
						skip: ps.offset,
						sort: { updatedAt: -1 },
					});
		}

		const ids = users.map(user => user._id);

		// 足りなかったら、username (local) の前方一致でid順
		if (users.length < ps.limit) {
			const otherUsers = await User
				.find({
					_id: { $nin: ids },
					host: null,
					usernameLower: new RegExp('^' + escapeRegexp(ps.query.replace('@', '').toLowerCase())),
					isSuspended: { $ne: true }
				}, {
					limit: ps.limit - users.length,
					skip: ps.offset
				});

				users = users.concat(otherUsers);
		}

		// 足りなかったら、username (remote) の前方一致でid順
		if (users.length < ps.limit && !ps.localOnly) {
			const otherUsers = await User
				.find({
					_id: { $nin: ids },
					host: { $nin: hideHostsForRemote },
					usernameLower: new RegExp('^' + escapeRegexp(ps.query.replace('@', '').toLowerCase())),
					isSuspended: { $ne: true }
				}, {
					limit: ps.limit - users.length,
					skip: ps.offset
				});

			users = users.concat(otherUsers);
		}
	// ホスト名
	} else if (isHostname) {
		users = await User
		.find({
			host: isSelfHost(ps.query) ? null : toDbHost(ps.query.replace('@', '')),
			isSuspended: { $ne: true }
		}, {
			limit: ps.limit - users.length
		});
	}

	return await Promise.all(users.map(user => pack(user, me, { detail: ps.detail })));
});
