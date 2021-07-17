import $ from 'cafy';
import * as bcrypt from 'bcryptjs';
import { publishMainStream } from '../../../../services/stream';
import generateUserToken from '../../common/generate-native-user-token';
import define from '../../define';
import { Users, UserProfiles } from '../../../../models';
import { ensure } from '../../../../prelude/ensure';
import { publishTerminate } from '../../../../services/server-event';

export const meta = {
	requireCredential: true,

	secure: true,

	params: {
		password: {
			validator: $.str
		}
	}
};

export default define(meta, async (ps, user) => {
	const profile = await UserProfiles.findOne(user.id).then(ensure);

	// Compare password
	const same = await bcrypt.compare(ps.password, profile.password!);

	if (!same) {
		throw new Error('incorrect password');
	}

	// Generate secret
	const secret = generateUserToken();

	await Users.update(user.id, {
		token: secret
	});

	// Publish event
	publishMainStream(user.id, 'myTokenRegenerated');

	// Terminate streaming
	setTimeout(() => {
		publishTerminate(user.id);
	}, 5000);
});
