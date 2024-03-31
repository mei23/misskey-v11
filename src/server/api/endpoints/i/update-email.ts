import $ from 'cafy';
import { publishMainStream } from '../../../../services/stream';
import define from '../../define';
import rndstr from 'rndstr';
import config from '../../../../config';
import * as ms from 'ms';
import * as bcrypt from 'bcryptjs';
import { Users, UserProfiles } from '../../../../models';
import { ensure } from '../../../../prelude/ensure';
import { sendEmail } from '../../../../services/send-email';
import { ApiError } from '../../error';

export const meta = {
	requireCredential: true,

	secure: true,

	limit: {
		duration: ms('1hour'),
		max: 3
	},

	params: {
		password: {
			validator: $.str
		},

		email: {
			validator: $.optional.nullable.str
		},
	},

	errors: {
		incorrectPassword: {
			message: 'Incorrect password.',
			code: 'INCORRECT_PASSWORD',
			id: 'e54c1d7e-e7d6-4103-86b6-0a95069b4ad3'
		},
	}
};

export default define(meta, async (ps, user) => {
	const profile = await UserProfiles.findOne({ userId: user.id }).then(ensure);

	// Compare password
	const same = await bcrypt.compare(ps.password, profile.password!);

	if (!same) {
		throw new ApiError(meta.errors.incorrectPassword);
	}

	await UserProfiles.update({ userId: user.id }, {
		email: ps.email,
		emailVerified: false,
		emailVerifyCode: null
	});

	const iObj = await Users.pack(user.id, user, {
		detail: true,
		includeSecrets: true
	});

	// Publish meUpdated event
	publishMainStream(user.id, 'meUpdated', iObj);

	if (ps.email != null) {
		const code = rndstr('a-z0-9', 16);

		await UserProfiles.update({ userId: user.id }, {
			emailVerifyCode: code
		});

		const link = `${config.url}/verify-email/${code}`;

		sendEmail(ps.email, 'Email verification', `To verify email, please click this link: ${link}`);
	}

	return iObj;
});
