import $ from 'cafy';
import define from '../../../define';
import { detectUrlMime } from '../../../../../misc/detect-url-mime';
import { ID } from '../../../../../misc/cafy-id';
import { Emojis } from '../../../../../models';
import { getConnection } from 'typeorm';
import { ApiError } from '../../../error';

export const meta = {
	desc: {
		'ja-JP': 'カスタム絵文字を更新します。'
	},

	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {
		id: {
			validator: $.type(ID)
		},

		name: {
			validator: $.str
		},

		category: {
			validator: $.optional.str
		},

		url: {
			validator: $.str
		},

		aliases: {
			validator: $.arr($.str)
		}
	},

	errors: {
		noSuchEmoji: {
			message: 'No such emoji.',
			code: 'NO_SUCH_EMOJI',
			id: '684dec9d-a8c2-4364-9aa8-456c49cb1dc8'
		}
	}
};

export default define(meta, async (ps) => {
	const emoji = await Emojis.findOne({ id: ps.id });

	if (emoji == null) throw new ApiError(meta.errors.noSuchEmoji);

	const type = await detectUrlMime(ps.url);

	await Emojis.update(emoji.id, {
		updatedAt: new Date(),
		name: ps.name,
		category: ps.category,
		aliases: ps.aliases,
		url: ps.url,
		type,
	});

	await getConnection().queryResultCache!.remove(['meta_emojis']);
});
