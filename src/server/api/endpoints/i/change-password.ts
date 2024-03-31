import $ from 'cafy';
import * as bcrypt from 'bcryptjs';
import define from '../../define';
import { UserProfiles } from '../../../../models';
import { ensure } from '../../../../prelude/ensure';

export const meta = {
	requireCredential: true,

	secure: true,

	params: {
		currentPassword: {
			validator: $.str
		},

		newPassword: {
			validator: $.str.min(1)
		}
	}
};

export default define(meta, async (ps, user) => {
	const profile = await UserProfiles.findOne({ userId: user.id }).then(ensure);

	// Compare password
	const same = await bcrypt.compare(ps.currentPassword, profile.password!);

	if (!same) {
		throw new Error('incorrect password');
	}

	// Generate hash of password
	const salt = await bcrypt.genSalt(8);
	const hash = await bcrypt.hash(ps.newPassword, salt);

	await UserProfiles.update({ userId: user.id }, {
		password: hash
	});
});
