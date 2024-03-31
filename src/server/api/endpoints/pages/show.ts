import $ from 'cafy';
import define from '../../define';
import { ApiError } from '../../error';
import { Pages, Users } from '../../../../models';
import { ID } from '../../../../misc/cafy-id';
import { Page } from '../../../../models/entities/page';

export const meta = {
	desc: {
		'ja-JP': '指定したページの情報を取得します。',
	},

	tags: ['pages'],

	requireCredential: false,

	params: {
		pageId: {
			validator: $.optional.type(ID),
			desc: {
				'ja-JP': '対象のページのID',
				'en-US': 'Target page ID.'
			}
		},

		name: {
			validator: $.optional.str,
		},

		username: {
			validator: $.optional.str,
		},
	},

	res: {
		type: 'object' as const,
		optional: false as const, nullable: false as const,
		ref: 'Page',
	},

	errors: {
		noSuchPage: {
			message: 'No such page.',
			code: 'NO_SUCH_PAGE',
			id: '222120c0-3ead-4528-811b-b96f233388d7'
		}
	}
};

export default define(meta, async (ps, user) => {
	let page: Page | undefined;

	if (ps.pageId) {
		page = await Pages.findOne({ id: ps.pageId });
	} else if (ps.name && ps.username) {
		const author = await Users.findOne({
			host: null,
			usernameLower: ps.username.toLowerCase()
		});
		if (author) {
			page = await Pages.findOne({
				name: ps.name,
				userId: author.id
			});
		}
	}

	if (page == null) {
		throw new ApiError(meta.errors.noSuchPage);
	}

	return await Pages.pack(page, user);
});
