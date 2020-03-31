//import $ from 'cafy';
import define from '../../define';
import AccessToken from '../../../../models/access-token';
import App from '../../../../models/app';

export const meta = {
	requireCredential: true as const,

	secure: true,

	params: {
	}
};

export default define(meta, async (ps, user) => {
	const tokens = await AccessToken.find({
		userId: user._id
	}, {
		sort: {
			_id: -1
		}
	});

	return await Promise.all(tokens.map(async token => {
		const app = await App.findOne({
			_id: token.appId
		});

		return {
			id: token._id,
			name: app.name,
			description: app.description,
			createdAt: token.createdAt,
			permission: app.permission,
		};
	}));
});
