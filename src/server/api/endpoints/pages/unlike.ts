import $ from 'cafy';
import { ID } from '../../../../misc/cafy-id';
import define from '../../define';
import { ApiError } from '../../error';
import { Pages, PageLikes } from '../../../../models';

export const meta = {
	desc: {
		'ja-JP': '指定したページの「いいね」を解除します。',
	},

	tags: ['pages'],

	requireCredential: true,

	kind: 'write:page-likes',

	params: {
		pageId: {
			validator: $.type(ID),
			desc: {
				'ja-JP': '対象のページのID',
				'en-US': 'Target page ID.'
			}
		}
	},

	errors: {
		noSuchPage: {
			message: 'No such page.',
			code: 'NO_SUCH_PAGE',
			id: 'a0d41e20-1993-40bd-890e-f6e560ae648e'
		},

		notLiked: {
			message: 'You have not liked that page.',
			code: 'NOT_LIKED',
			id: 'f5e586b0-ce93-4050-b0e3-7f31af5259ee'
		},
	}
};

export default define(meta, async (ps, user) => {
	const page = await Pages.findOne({ id: ps.pageId });
	if (page == null) {
		throw new ApiError(meta.errors.noSuchPage);
	}

	const exist = await PageLikes.findOne({
		pageId: page.id,
		userId: user.id
	});

	if (exist == null) {
		throw new ApiError(meta.errors.notLiked);
	}

	// Delete like
	await PageLikes.delete(exist.id);

	Pages.decrement({ id: page.id }, 'likedCount', 1);
});
