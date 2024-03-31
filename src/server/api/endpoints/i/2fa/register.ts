import $ from 'cafy';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import config from '../../../../../config';
import define from '../../../define';
import { UserProfiles } from '../../../../../models';
import { ensure } from '../../../../../prelude/ensure';

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
	const profile = await UserProfiles.findOne({ userId: user.id }).then(ensure);

	// Compare password
	const same = await bcrypt.compare(ps.password, profile.password!);

	if (!same) {
		throw new Error('incorrect password');
	}

	// Generate user's secret key
	const secret = speakeasy.generateSecret({
		length: 32
	});

	await UserProfiles.update({ userId: user.id }, {
		twoFactorTempSecret: secret.base32
	});

	// Get the data URL of the authenticator URL
	const dataUrl = await QRCode.toDataURL(speakeasy.otpauthURL({
		secret: secret.base32,
		encoding: 'base32',
		label: user.username,
		issuer: config.host
	}));

	return {
		qr: dataUrl,
		secret: secret.base32,
		label: user.username,
		issuer: config.host
	};
});
