import getNoteSummary from '../../../../misc/get-note-summary';
import getReactionEmoji from '../../../../misc/get-reaction-emoji';
import getUserName from '../../../../misc/get-user-name';

type Notification = {
	title: string;
	body: string;
	icon: string;
	onclick?: any;
};

// TODO: i18n

export default function(type, data): Notification {
	switch (type) {
		case 'driveFileCreated':
			return {
				title: 'File uploaded',
				body: data.name,
				icon: data.url
			};

		case 'unreadMessagingMessage':
			return {
				title: `New message from ${getUserName(data.user)}`,
				body: data.text, // TODO: getMessagingMessageSummary(data),
				icon: data.user.avatarUrl
			};

		case 'reversiInvited':
			return {
				title: 'Play reversi with me',
				body: `You got reversi invitation from ${getUserName(data.parent)}`,
				icon: data.parent.avatarUrl
			};

		case 'notification':
			const notification = data as any;	// TODO: PackedNotification
			switch (notification.type) {
				case 'mention':
					return {
						title: `${getUserName(notification.user)}:`,
						body: getNoteSummary(notification.note),
						icon: notification.user.avatarUrl
					};

				case 'reply':
					return {
						title: `You got reply from ${getUserName(notification.user)}:`,
						body: getNoteSummary(notification.note),
						icon: notification.user.avatarUrl
					};

				case 'quote':
					return {
						title: `${getUserName(notification.user)}:`,
						body: getNoteSummary(notification.note),
						icon: notification.user.avatarUrl
					};

				case 'reaction':
					return {
						title: `${getUserName(notification.user)}: ${getReactionEmoji(notification.reaction)}:`,
						body: getNoteSummary(notification.note),
						icon: notification.user.avatarUrl
					};

				default:
					return null;
			}

		default:
			return null;
	}
}
