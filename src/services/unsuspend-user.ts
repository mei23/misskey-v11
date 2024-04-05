import renderDelete from '../remote/activitypub/renderer/delete';
import renderUndo from '../remote/activitypub/renderer/undo';
import { renderActivity } from '../remote/activitypub/renderer';
import { deliver } from '../queue';
import config from '../config';
import { User } from '../models/entities/user';
import { Users, Followings } from '../models';
import { Not, IsNull, Brackets } from 'typeorm';
import { processStreamingRows } from '../misc/process-streaming-rows';

export async function doPostUnsuspend(user: User) {
	if (Users.isLocalUser(user)) {
		// 知り得る全SharedInboxにUndo Delete配信
		const content = renderActivity(renderUndo(renderDelete(`${config.url}/users/${user.id}`, user), user));

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

			await processStreamingRows(query, async (row: Record<string, unknown>) => {
				if (typeof row.inbox === 'string') {
					try {
						await deliver(user as any, content, row.inbox);
					} catch (e) {
						console.warn(`deliver error ${e}`);
					}
				} else {
					console.warn(`invalid row.inbox`);
				}
			});
	}
}
