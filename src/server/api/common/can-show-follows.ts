import { ILocalUser, IUser, getRelation } from '../../../models/user';
import { oidEquals } from '../../../prelude/oid';

export async function canShowFollows(me: ILocalUser, user: IUser) {
	// 未指定なら許可
	if (!user.hideFollows) {
		return true;
	}

	// 未指定以外なら匿名じゃ見れない
	if (!me) {
		return false;
	}

	// 自分は常に許可
	if (oidEquals(user._id, me._id)) {
		return true;
	}

	// フォロワーのみ
	if (user.hideFollows === 'follower') {
		const relation = await getRelation(me._id, user._id);
		return relation.isFollowing;
	}

	// それ以外の値は拒否
	return false;
}
