import $ from 'cafy';
import define from '../../define';
import { ApiError } from '../../error';
import { Pages } from '../../../../models';
import { ID } from '../../../../misc/cafy-id';

export const meta = {
	desc: {
		'ja-JP': '指定したページを削除します。',
	},

	tags: ['pages'],

	requireCredential: true,

	kind: 'write:pages',

	params: {
		pageId: {
			validator: $.type(ID),
			desc: {
				'ja-JP': '対象のページのID',
				'en-US': 'Target page ID.'
			}
		},
	},

	errors: {
		noSuchPage: {
			message: 'No such page.',
			code: 'NO_SUCH_PAGE',
			id: 'eb0c6e1d-d519-4764-9486-52a7e1c6392a'
		},

		accessDenied: {
			message: 'Access denied.',
			code: 'ACCESS_DENIED',
			id: '8b741b3e-2c22-44b3-a15f-29949aa1601e'
		},
	}
};

export default define(meta, async (ps, user) => {
	const page = await Pages.findOne({ id: ps.pageId });
	if (page == null) {
		throw new ApiError(meta.errors.noSuchPage);
	}
	if (page.userId !== user.id) {
		throw new ApiError(meta.errors.accessDenied);
	}

	await Pages.delete(page.id);
});
