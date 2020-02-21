import define from '../../define';

export const meta = {
	desc: {
		'ja-JP': 'hotタイムラインを取得します。'
	},

	tags: ['notes'],

	params: {
	},

	res: {
		type: 'array',
		items: {
			type: 'Note',
		},
	},

	errors: {
	}
};

export default define(meta, async (ps, user) => {
	return [];
});
