import config from '../../../config';
import { v4 as uuid } from 'uuid';
import { IActivity } from '../type';
import { LdSignature } from '../misc/ld-signature';
import { ILocalUser } from '../../../models/entities/user';
import { UserKeypairs } from '../../../models';
import { ensure } from '../../../prelude/ensure';
import { FIXED_CONTEXT } from '../misc/contexts';

export const renderActivity = (x: any): IActivity | null => {
	if (x == null) return null;

	if (x !== null && typeof x === 'object' && x.id == null) {
		x.id = `${config.url}/${uuid()}`;
	}

	return Object.assign({
		'@context': FIXED_CONTEXT
	}, x);
};

export const attachLdSignature = async (activity: any, user: ILocalUser): Promise<IActivity | null> => {
	if (activity == null) return null;

	const keypair = await UserKeypairs.findOne({
		userId: user.id
	}).then(ensure);

	const ldSignature = new LdSignature();
	ldSignature.debug = false;
	activity = await ldSignature.signRsaSignature2017(activity, keypair.privateKey, `${config.url}/users/${user.id}#main-key`);

	return activity;
};
