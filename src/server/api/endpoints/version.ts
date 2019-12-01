import config from '../../../config';
import define from '../define';

export const meta = {
	desc: {
		'ja-JP': 'インスタンスバージョンを取得します。',
		'en-US': 'Get the version of this instance.'
	},

	tags: ['meta'],

	requireCredential: false,

	res: {
		type: 'object',
		properties: {
			version: {
				type: 'string',
				description: 'The version of Misskey of this instance.',
				example: config.version
			},
		}
	}
};

export default define(meta, async (ps, me) => {
	const response = {
		version: config.version,
	};
	return response;
});
