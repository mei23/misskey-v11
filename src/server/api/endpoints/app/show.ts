import $ from 'cafy';
import { ID } from '../../../../misc/cafy-id';
import define from '../../define';
import { ApiError } from '../../error';
import { Apps } from '../../../../models';

export const meta = {
	tags: ['app'],

	params: {
		appId: {
			validator: $.type(ID),
		},
	},

	res: {
		type: 'object' as const,
		optional: false as const, nullable: false as const,
		ref: 'App',
	},

	errors: {
		noSuchApp: {
			message: 'No such app.',
			code: 'NO_SUCH_APP',
			id: 'dce83913-2dc6-4093-8a7b-71dbb11718a3'
		}
	}
};

export default define(meta, async (ps, user, app) => {
	const isSecure = user != null && app == null;

	// Lookup app
	const ap = await Apps.findOne({ id: ps.appId });

	if (ap == null) {
		throw new ApiError(meta.errors.noSuchApp);
	}

	return await Apps.pack(ap, user, {
		detail: true,
		includeSecret: isSecure && (ap.userId === user.id)
	});
});
