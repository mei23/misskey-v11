import renderDelete from '../remote/activitypub/renderer/delete';
import { renderActivity } from '../remote/activitypub/renderer';
import { deliver } from '../queue';
import config from '../config';
import { User } from '../models/entities/user';
import { Users, Followings } from '../models';
import { Not, IsNull, Brackets, SelectQueryBuilder } from 'typeorm';
import { ReadStream } from 'typeorm/platform/PlatformTools';

export async function doPostSuspend(user: User) {
	if (Users.isLocalUser(user)) {
		// 知り得る全SharedInboxにDelete配信
		const content = renderActivity(renderDelete(`${config.url}/users/${user.id}`, user));

		const query = Followings.createQueryBuilder('following')
			.select('distinct coalesce(following.followerSharedInbox, following.followeeSharedInbox) as inbox') 
			.where(new Brackets((qb) =>
				qb.where({ followerHost: Not(IsNull()) })
				.orWhere({ followeeHost: Not(IsNull()) })
			))
			.andWhere(new Brackets((qb) => 
				qb.where({ followerSharedInbox: Not(IsNull()) })
				.orWhere({ followeeSharedInbox: Not(IsNull()) })
			));

		for (const row of await query.getRawMany()) {
			deliver(user as any, content, row.inbox);
		}

		/* streaming ここまでいらないと思うが
		async function ProcessStreamingRow<T> (query: SelectQueryBuilder<T>, callback: (row: Record<string, unknown>) => Promise<void>) {
			return new Promise(async (res, rej) => {
				// query and get stream
				let stream: ReadStream;
				try {
					stream = await query.stream();
				} catch (e) {
					return rej(e);
				}

				stream
					.on('data', async (data: any) => {	// Buffer | string のはずだけどobjectが返ってくる
						try {
							await callback(data);
						} catch (e) {
							rej(e);
						}
					})
					.on('end', () => res('end'))
					.on('error', err => rej(err));
			});
		}

		await ProcessStreamingRow(query, async row => {
			if (typeof row.inbox === 'string') {
				deliver(user as any, content, row.inbox);
			} else {
				console.warn('nnn');
			}
		});
		*/
	}
}
