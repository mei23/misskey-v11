import $ from 'cafy';
import Hashtag from '../../../../models/hashtag';
import define from '../../define';
import * as escapeRegexp from 'escape-regexp';

export const meta = {
	desc: {
		'ja-JP': 'ハッシュタグを検索します。'
	},

	tags: ['hashtags'],

	requireCredential: false,

	allowGet: true,
	cacheSec: 300,

	params: {
		limit: {
			validator: $.optional.either($.optional.num.range(1, 100), $.str.pipe(v => 1 <= Number(v) && Number(v) <= 100)),
			default: 10,
			transform: (v: any) => JSON.parse(v),
			desc: {
				'ja-JP': '最大数'
			}
		},

		query: {
			validator: $.str,
			desc: {
				'ja-JP': 'クエリ'
			}
		},

		offset: {
			validator: $.optional.either($.optional.num.min(0), $.str.pipe(v => 0 <= Number(v))),
			default: 0,
			transform: (v: any) => JSON.parse(v),
			desc: {
				'ja-JP': 'オフセット'
			}
		}
	},

	res: {
		type: 'array',
		items: {
			type: 'string'
		}
	},
};

export default define(meta, async (ps) => {
	const hashtags = await Hashtag
		.find({
			tag: new RegExp('^' + escapeRegexp(ps.query.toLowerCase()))
		}, {
			sort: {
				count: -1
			},
			limit: ps.limit,
			skip: ps.offset
		});

	return hashtags.map(tag => tag.tag);
});
