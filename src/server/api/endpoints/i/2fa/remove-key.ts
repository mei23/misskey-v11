import $ from 'cafy';
import * as bcrypt from 'bcryptjs';
import define from '../../../define';
import { UserProfiles, UserSecurityKeys, Users } from '../../../../../models';
import { ensure } from '../../../../../prelude/ensure';
import { publishMainStream } from '../../../../../services/stream';

export const meta = {
	requireCredential: true,

	secure: true,

	params: {
		password: {
			validator: $.str
		},
		credentialId: {
			validator: $.str
		},
	}
};

export default define(meta, async (ps, user) => {
	const profile = await UserProfiles.findOne({ userId: user.id }).then(ensure);

	// Compare password
	const same = await bcrypt.compare(ps.password, profile.password!);

	if (!same) {
		throw new Error('incorrect password');
	}

	// Make sure we only delete the user's own creds
	await UserSecurityKeys.delete({
		userId: user.id,
		id: ps.credentialId
	});

	// Publish meUpdated event
	publishMainStream(user.id, 'meUpdated', await Users.pack(user.id, user, {
		detail: true,
		includeSecrets: true
	}));

	return {};
});
