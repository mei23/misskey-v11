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
export default async function(resolver: Resolver, actor: IRemoteUser, activity: IAnnounce, targetUri: string): Promise<string> {
	const uri = getApId(activity);

	// アナウンサーが凍結されていたらスキップ
	if (actor.isSuspended) {
		return `skip: actor is suspended`;
	}

	// アナウンス先をブロックしてたら中断
	if (await isBlockedHost(extractApHost(uri))) return `skip: actor is blocked`;

	const unlock = await getApLock(uri);

	try {
		// 既に同じURIを持つものが登録されていないかチェック
		const exist = await fetchNote(uri);
		if (exist) {
			return `skip: duplicate activity id`;
		}

		// Announce対象をresolve
		let renote;
		try {
			renote = await resolveNote(targetUri, null, true);
		} catch (e) {
			// 対象が4xxならスキップ
			if (e.statusCode >= 400 && e.statusCode < 500) {
				return `skip: Ignored announce target: ${uri} => ${targetUri} - ${e.statusCode}`;
			}
			throw `Error in announce target: ${uri} => ${targetUri} - ${e.statusCode || e}`;
		}

		// skip unavailable
		if (renote == null) {
			return `skip: announce target is null: ${uri} => ${targetUri}`;
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
		return `ok`;
	} finally {
		unlock();
	}
}
