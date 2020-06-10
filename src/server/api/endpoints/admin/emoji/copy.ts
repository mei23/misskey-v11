import $ from 'cafy';
import define from '../../../define';
import { ApiError } from '../../../error';
import Emoji, { IEmoji } from '../../../../../models/emoji';
import ID from '../../../../../misc/cafy-id';
import { tryStockEmoji } from '../../../../../services/emoji-store';

export const meta = {
	tags: ['admin'],

	requireCredential: true as const,
	requireModerator: true,

	params: {
		emojiId: {
			validator: $.type(ID)
		},
	},

	errors: {
		noSuchEmoji: {
			message: 'No such emoji.',
			code: 'NO_SUCH_EMOJI',
			id: 'e2785b66-dca3-4087-9cac-b93c541cc425'
		},
		duplicatedName: {
			message: 'Duplicated name.',
			code: 'DUPLICATED_NAME',
			id: '3206c9df-e133-4f5b-bf1f-e51123efb39d'
		},
	}
};

export default define(meta, async (ps, me) => {
	let emoji = await Emoji.findOne(ps.emojiId);

	if (emoji == null) {
		throw new ApiError(meta.errors.noSuchEmoji);
	}

	const n = await Emoji.findOne({
		name: emoji.name,
		host: null,
	});

	if (n) {
		throw new ApiError(meta.errors.duplicatedName);
	}

	// ローカル未保存なら保存
	await tryStockEmoji(emoji);

	emoji = await Emoji.findOne(ps.emojiId) as IEmoji;

	const copied = await Emoji.insert({
		updatedAt: new Date(),
		name: emoji.name,
		host: null,
		aliases: [],
		url: emoji.url,
		type: emoji.type,
		md5: emoji.md5
	});

	return {
		id: copied._id
	};
});
