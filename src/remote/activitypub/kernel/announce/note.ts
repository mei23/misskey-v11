import Resolver from '../../resolver';
import post from '../../../../services/note/create';
import { IRemoteUser } from '../../../../models/user';
import { IAnnounce, getApId } from '../../type';
import { fetchNote, resolveNote } from '../../models/note';
import { apLogger } from '../../logger';
import { extractApHost } from '../../../../misc/convert-host';
import { getApLock } from '../../../../misc/app-lock';
import { isBlockedHost } from '../../../../misc/instance-info';
import { parseAudience } from '../../audience';

const logger = apLogger;

/**
 * アナウンスアクティビティを捌きます
 */
export default async function(resolver: Resolver, actor: IRemoteUser, activity: IAnnounce, targetUri: string): Promise<void> {
	const uri = getApId(activity);

	// アナウンサーが凍結されていたらスキップ
	if (actor.isSuspended) {
		return;
	}

	// アナウンス先をブロックしてたら中断
	if (await isBlockedHost(extractApHost(uri))) return;

	const unlock = await getApLock(uri);

	try {
		// 既に同じURIを持つものが登録されていないかチェック
		const exist = await fetchNote(uri);
		if (exist) {
			return;
		}

		// Announce対象をresolve
		let renote;
		try {
			renote = await resolveNote(targetUri, null, true);
		} catch (e) {
			// 対象が4xxならスキップ
			if (e.statusCode >= 400 && e.statusCode < 500) {
				logger.warn(`Ignored announce target: ${uri} => ${targetUri} - ${e.statusCode}`);
				return;
			}
			logger.warn(`Error in announce target: ${uri} => ${targetUri} - ${e.statusCode || e}`);
			throw e;
		}

		// skip unavailable
		if (renote == null) {
			logger.warn(`announce target is null: ${uri} => ${targetUri}`);
			throw new Error(`announce target is null: ${uri} => ${targetUri}`);
		}

		logger.info(`Creating the (Re)Note: ${uri}`);

		const activityAudience = await parseAudience(actor, activity.to, activity.cc);

		await post(actor, {
			createdAt: new Date(activity.published),
			renote,
			visibility: activityAudience.visibility,
			visibleUsers: activityAudience.visibleUsers,
			uri
		});
	} finally {
		unlock();
	}
}
