import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import User, { isRemoteUser } from '../../../../models/user';
import resolveRemoteUser from '../../../../remote/resolve-user';
import define from '../../define';
import { apiLogger } from '../../logger';
import { ApiError } from '../../error';
import { fetchOutbox } from '../../../../remote/activitypub/models/person';

const cursorOption = { fields: { data: false } };

export const meta = {
	desc: {
		'ja-JP': '指定したユーザーの情報を取得します。'
	},

	tags: ['users'],

	requireCredential: false,

	params: {
		userId: {
			validator: $.optional.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象のユーザーのID',
				'en-US': 'Target user ID'
			}
		},

		username: {
			validator: $.optional.str
		},

		host: {
			validator: $.optional.nullable.str
		},

		sync: {
			validator: $.optional.bool,
			default: false,
		},
	},

	errors: {
		failedToResolveRemoteUser: {
			message: 'Failed to resolve remote user.',
			code: 'FAILED_TO_RESOLVE_REMOTE_USER',
			id: 'f829f287-4296-421e-8888-42a6d9ddd7fd',
			kind: 'server' as 'server'
		},

		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '64e7f792-08c8-4c73-9b40-c5a02e532421'
		},
	}
};

export default define(meta, async (ps, me) => {
	let user;

	// Lookup user
	if (typeof ps.host === 'string') {
		user = await resolveRemoteUser(ps.username, ps.host, cursorOption).catch(e => {
			apiLogger.warn(`failed to resolve remote user: ${e}`);
			throw new ApiError(meta.errors.failedToResolveRemoteUser);
		});
	} else {
		const q: any = ps.userId != null
			? { _id: ps.userId }
			: { usernameLower: ps.username.toLowerCase(), host: null };

		user = await User.findOne(q, cursorOption);

		if (isRemoteUser(user)) {
			resolveRemoteUser(user.username, user.host);
		}
	}

	if (user === null) {
		throw new ApiError(meta.errors.noSuchUser);
	}

	if (me == null || !(me.isAdmin || me.isModerator)) {
		if (user.isSuspended) {
			throw new ApiError(meta.errors.noSuchUser);
		}
	}

	ps.sync ? await fetchOutbox(user) : fetchOutbox(user);
});
