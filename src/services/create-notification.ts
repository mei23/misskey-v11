import { publishMainStream } from './stream';
import pushSw from './push-notification';
import { Notifications, Mutings } from '../models';
import { genId } from '../misc/gen-id';
import { User } from '../models/entities/user';
import { Note } from '../models/entities/note';
import { Notification } from '../models/entities/notification';

export async function createNotification(
	notifieeId: User['id'],
	notifierId: User['id'],
	type: string,
	content?: {
		noteId?: Note['id'];
		reaction?: string;
		choice?: number;
	}
) {
	if (notifieeId === notifierId) {
		return null;
	}

	const data = {
		id: genId(),
		createdAt: new Date(),
		notifieeId: notifieeId,
		notifierId: notifierId,
		type: type,
		isRead: false,
	} as Partial<Notification>;

	if (content) {
		if (content.noteId) data.noteId = content.noteId;
		if (content.reaction) data.reaction = content.reaction;
		if (content.choice) data.choice = content.choice;
	}

	// Create notification
	const notification = await Notifications.insert(data)
		.then(x => Notifications.findOneOrFail(x.identifiers[0]));

	const packed = await Notifications.pack(notification);

	// Publish notification event
	publishMainStream(notifieeId, 'notification', packed);

	// 2秒経っても(今回作成した)通知が既読にならなかったら「未読の通知がありますよ」イベントを発行する
	setTimeout(async () => {
		const fresh = await Notifications.findOne({ id: notification.id });
		if (fresh == null) return; // 既に削除されているかもしれない
		if (!fresh.isRead) {
			//#region ただしミュートしているユーザーからの通知なら無視
			const mutings = await Mutings.find({
				muterId: notifieeId
			});
			if (mutings.map(m => m.muteeId).includes(notifierId)) {
				return;
			}
			//#endregion

			publishMainStream(notifieeId, 'unreadNotification', packed);

			pushSw(notifieeId, 'notification', packed);
		}
	}, 2000);

	return notification;
}
