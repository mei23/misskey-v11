import config from '../../../config';
import { createPublicKey } from 'crypto';
import { ILocalUser } from '../../../models/user';

export default (user: ILocalUser) => ({
	id: `${config.url}/users/${user._id}/publickey`,
	type: 'Key',
	owner: `${config.url}/users/${user._id}`,
	publicKeyPem: createPublicKey(user.keypair).export({
		type: 'spki',
		format: 'pem'
	})
});
