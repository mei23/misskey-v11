import { EntityRepository, Repository } from 'typeorm';
import { Apps } from '..';
import { AuthSession } from '../entities/auth-session';
import { ensure } from '../../prelude/ensure';
import { awaitAll } from '../../prelude/await-all';

@EntityRepository(AuthSession)
export class AuthSessionRepository extends Repository<AuthSession> {
	public async pack(
		src: AuthSession['id'] | AuthSession,
		me?: any
	) {
		const session = typeof src === 'object' ? src : await this.findOne({ id: src }).then(ensure);

		return await awaitAll({
			id: session.id,
			app: Apps.pack(session.appId, me),
			token: session.token
		});
	}
}
