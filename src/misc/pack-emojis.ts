import User from '../models/user';
import Emoji from '../models/emoji';
import { toUnicode, toASCII } from 'punycode';
import config from '../config';
import { isSelfHost } from './convert-host';
import getDriveFileUrl from './get-drive-file-url';
import DriveFile from '../models/drive-file';

type IREmoji = {
	/**
	 * requested emoji key
	 */
	name: string,
	url: string,
	/***
	 * resolved host(in unicode)
	 */
	host: string,
	resolvable: string,
};

const SELF_HOST: string = null;

/**
 * 絵文字クエリ
 * @param emojis 絵文字名一覧
 * @param ownerHost 投稿またはプロフィール所有者のホスト
 * @param reactionEmojis リアクションの絵文字名一覧
 */
export async function packEmojis(emojis: string[], ownerHost: string, reactionEmojis = [] as string[]) {
	const [custom, avatar] = await Promise.all([
		packCustomEmojis(emojis, ownerHost, true, reactionEmojis),
		packAvatarEmojis(emojis, ownerHost, true)
	]);

	return custom.concat(avatar);
}

/**
 * Pack avatar emojis
 * @param emojis 絵文字名一覧
 * @param host 投稿またはプロフィール所有者のホスト
 * @param foreign 外部ホスト指定を許可する
 */
export async function packAvatarEmojis(emojis: string[], ownerHost: string, foreign: boolean): Promise<IREmoji[]> {
	const avatarKeys = emojis
		.map(name => {
			const match = foreign ? name.match(/^@([\w-]+)(?:@([\w.-]+))?$/) : name.match(/^@([\w-]+)$/);
			if (!match) return null;

			let queryHost = foreign ? match[2] || (ownerHost || SELF_HOST) : SELF_HOST;
			if (isSelfHost(queryHost)) queryHost = SELF_HOST;

			return {
				emoji: match[0],
				usernameLower: match[1].toLowerCase(),
				host: normalizeHost(queryHost),
				resolvable: `@${match[1]}` + (queryHost ? `@${normalizeAsciiHost(queryHost)}` : '')
			};
		})
		.filter(x => x != null);

	let avatarEmojis = await Promise.all(avatarKeys.map(async key =>  {
		const user = await User.findOne({
			usernameLower: key.usernameLower,
			host: key.host
		});

		const profileEmoji = {
			name: key.emoji,
			url: (user && user.avatarId) ? getDriveFileUrl(await DriveFile.findOne({ _id: user.avatarId }), true, false) : `${config.driveUrl}/default-avatar.jpg`,
			host: key.host,
			resolvable: key.resolvable,
		} as IREmoji;

		return profileEmoji;
	}));

	avatarEmojis = avatarEmojis.filter(x => x != null);

	return avatarEmojis;
}

/**
 * Pack custom emojis
 * @param emojis 絵文字名一覧
 * @param host 投稿またはプロフィール所有者のホスト
 * @param foreign 外部ホスト指定を許可する
 */
export async function packCustomEmojis(emojis: string[], ownerHost: string, foreign: boolean, reactionEmojis = [] as string[]): Promise<IREmoji[]> {
	const customKeys = emojis
		.map(name => {
			const match = foreign ? name.match(/^(\w+)(?:@([\w.-]+))?$/) : name.match(/^(\w+)$/);
			if (!match) return null;

			let queryHost = foreign
				? match[2] || (ownerHost || SELF_HOST)	// 通常のカスタム絵文字の場合、絶対指定ならそれ || なければNote所有者のホスト
				: SELF_HOST;	// 外部参照を許可しない場合は常に自分のホスト
			if (isSelfHost(queryHost)) queryHost = SELF_HOST;

			return {
				emoji: match[0],
				name: match[1],
				host: normalizeHost(queryHost),
				resolvable: `${match[1]}` + (queryHost ? `@${normalizeAsciiHost(queryHost)}` : ''),
			};
		})
		.filter(x => x != null);

	const reactionKeys = reactionEmojis
		.map(name => {
			const match = foreign ? name.match(/^(\w+)(?:@([\w.-]+))?$/) : name.match(/^(\w+)$/);
			if (!match) return null;

			// リアクションカスタム絵文字のクエリに使うホスト
			let queryHost = foreign
				? match[2] || SELF_HOST	// 絶対指定ならそれ、なければローカルホスト
				: SELF_HOST;
			// ローカルホストはおそらく.
			if (isSelfHost(queryHost) || queryHost === '.') queryHost = SELF_HOST;

			return {
				emoji: match[0],
				name: match[1],
				host: normalizeHost(queryHost),
				resolvable: `${match[1]}` + (queryHost ? `@${normalizeAsciiHost(queryHost)}` : ''),
			};
		})
		.filter(x => x != null);

	const keys = customKeys.concat(reactionKeys);

	let customEmojis = await Promise.all(keys.map(async key =>  {
		const emoji = await Emoji.findOne({
			name: key.name,
			host: key.host
		}, {
			fields: { _id: false }
		});

		if (emoji == null) return null;

		const customEmoji = {
			name: key.emoji,
			url: (key.host && !emoji.saved) ? `${config.url}/files/${emoji.name}@${emoji.host}/${emoji.updatedAt ? emoji.updatedAt.getTime().toString(16) : '0'}.png` : emoji.url,
			//host: key.host,
			resolvable: key.resolvable,
		} as IREmoji;

		return customEmoji;
	}));

	customEmojis = customEmojis.filter(x => x != null);

	return customEmojis;
}

const normalizeHost = (host: string) => {
	if (host == null) return null;
	return toUnicode(host.toLowerCase());
};

const normalizeAsciiHost = (host: string) => {
	if (host == null) return null;
	return toASCII(host.toLowerCase());
};
