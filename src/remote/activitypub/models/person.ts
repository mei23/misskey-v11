import * as promiseLimit from 'promise-limit';

import $, { Context } from 'cafy';
import config from '../../../config';
import Resolver from '../resolver';
import { resolveImage } from './image';
import { isCollectionOrOrderedCollection, isCollection, IActor, getApId, getOneApHrefNullable, IObject, getApType, isActor } from '../type';
import { fromHtml } from '../../../mfm/fromHtml';
import { htmlToMfm } from '../misc/html-to-mfm';
import { resolveNote, extractEmojis } from './note';
import { registerOrFetchInstanceDoc } from '../../../services/register-or-fetch-instance-doc';
import { extractApHashtags } from './tag';
import { apLogger } from '../logger';
import { Note } from '../../../models/entities/note';
import { updateUsertags } from '../../../services/update-hashtag';
import { Users, Instances, Followings, UserProfiles, UserPublickeys } from '../../../models';
import { User, IRemoteUser } from '../../../models/entities/user';
import { Emoji } from '../../../models/entities/emoji';
import { UserNotePining } from '../../../models/entities/user-note-pinings';
import { genId } from '../../../misc/gen-id';
import { instanceChart, usersChart } from '../../../services/chart';
import { UserPublickey } from '../../../models/entities/user-publickey';
import { isDuplicateKeyValueError } from '../../../misc/is-duplicate-key-value-error';
import { isSelfOrigin, toPuny } from '../../../misc/convert-host';
import { UserProfile } from '../../../models/entities/user-profile';
import { getConnection, Not } from 'typeorm';
import { ensure } from '../../../prelude/ensure';
import { toArray } from '../../../prelude/array';
import { fetchNodeinfo } from '../../../services/fetch-nodeinfo';
import { normalizeTag } from '../../../misc/normalize-tag';
import { resolveUser } from '../../resolve-user';
import { StatusError } from '../../../misc/fetch';
import { resolveAnotherUser } from '../resolve-another-user';

const logger = apLogger;

const MAX_NAME_LENGTH = 128;
const MAX_SUMMARY_LENGTH = 2048;

const truncate = (value: string, maxLength: number) => {
	return value.substr(0, maxLength);
};

/**
 * Validate and convert to actor object
 * @param x Fetched object
 * @param uri Fetch target URI
 */
function validateActor(x: IObject, uri: string): IActor {
	const expectHost = toPuny(new URL(uri).hostname);

	if (x == null) {
		throw new Error('invalid Actor: object is null');
	}

	if (!isActor(x)) {
		throw new Error(`invalid Actor type '${x.type}'`);
	}

	const validate = (name: string, value: any, validater: Context) => {
		const e = validater.test(value);
		if (e) throw new Error(`invalid Actor: ${name} ${e.message}`);
	};

	validate('id', x.id, $.str.min(1));
	validate('inbox', x.inbox, $.str.min(1));
	validate('preferredUsername', x.preferredUsername, $.str.min(1).max(128).match(/^\w([\w-.]*\w)?$/));
	validate('name', x.name, $.optional.nullable.str);
	validate('summary', x.summary, $.optional.nullable.str);

	const idHost = toPuny(new URL(x.id!).hostname);
	if (idHost !== expectHost) {
		throw new Error('invalid Actor: id has different host');
	}

	if (x.publicKey) {
		if (typeof x.publicKey.id !== 'string') {
			throw new Error('invalid Actor: publicKey.id is not a string');
		}

		const publicKeyIdHost = toPuny(new URL(x.publicKey.id).hostname);
		if (publicKeyIdHost !== expectHost) {
			throw new Error('invalid Actor: publicKey.id has different host');
		}
	}

	return x;
}

/**
 * Personをフェッチします。
 *
 * Misskeyに対象のPersonが登録されていればそれを返します。
 */
export async function fetchPerson(uri: string, resolver?: Resolver): Promise<User | null> {
	if (typeof uri !== 'string') throw new Error('uri is not string');

	// URIがこのサーバーを指しているならデータベースからフェッチ
	if (isSelfOrigin(uri)) {
		const id = uri.split('/').pop();
		return await Users.findOne(id).then(x => x || null);
	}

	//#region このサーバーに既に登録されていたらそれを返す
	const exist = await Users.findOne({ uri });

	if (exist) {
		return exist;
	}
	//#endregion

	return null;
}

/**
 * Personを作成します。
 */
export async function createPerson(uri: string, resolver?: Resolver): Promise<User> {
	if (typeof uri !== 'string') throw new Error('uri is not string');

	if (isSelfOrigin(uri)) {
		throw new StatusError('cannot resolve local user', 400, 'cannot resolve local user');
	}

	if (resolver == null) resolver = new Resolver();

	const object = await resolver.resolve(uri) as any;

	const person = validateActor(object, uri);

	logger.info(`Creating the Person: ${person.id}`);

	const host = toPuny(new URL(object.id).hostname);

	const { fields } = analyzeAttachments(person.attachment || []);

	const tags = extractApHashtags(person.tag).map(tag => normalizeTag(tag)).splice(0, 32);

	const isBot = getApType(object) === 'Service';

	const movedTo = (person.id && person.movedTo)
		? await resolveAnotherUser(person.id, person.movedTo, resolver)
			.catch(e => {
				logger.warn(`Error in movedTo: ${e}`);
				return null;
			})
		: null;

	// Create user
	let user: IRemoteUser;
	try {
		// Start transaction
		await getConnection().transaction(async transactionalEntityManager => {
			user = await transactionalEntityManager.insert(User, {
				id: genId(),
				avatarId: null,
				bannerId: null,
				createdAt: new Date(),
				lastFetchedAt: new Date(),
				name: person.name ? truncate(person.name, MAX_NAME_LENGTH) : person.name,
				isLocked: !!person.manuallyApprovesFollowers,
				isIndexable: !(person.indexable === false),
				isExplorable: !!person.discoverable,
				username: person.preferredUsername,
				usernameLower: person.preferredUsername!.toLowerCase(),
				host,
				inbox: person.inbox,
				sharedInbox: person.sharedInbox || (person.endpoints ? person.endpoints.sharedInbox : undefined),
				featured: person.featured ? getApId(person.featured) : undefined,
				uri: person.id,
				tags,
				isBot,
				isCat: (person as any).isCat === true,
				movedToUserId: movedTo?.id || null,
			}).then(x => transactionalEntityManager.findOneOrFail(User, x.identifiers[0])) as IRemoteUser;

			await transactionalEntityManager.insert(UserProfile, {
				userId: user.id,
				description: person.summary ? htmlToMfm(truncate(person.summary, MAX_SUMMARY_LENGTH), person.tag) : null,
				url: getOneApHrefNullable(person.url),
				fields,
				userHost: host
			});

			if (person.publicKey) {
				await transactionalEntityManager.insert(UserPublickey, {
					userId: user.id,
					keyId: person.publicKey.id,
					keyPem: person.publicKey.publicKeyPem
				});
			}
		});
	} catch (e) {
		// duplicate key error
		if (isDuplicateKeyValueError(e)) {
			// 同じ@username@hostを持つものがあった場合、エラーで被った先を返す
			const u = await Users.findOne({
				uri: Not(person.id as string),
				usernameLower: person.preferredUsername!.toLowerCase(),
				host,
			});

			if (u) {
				throw {
					code: 'DUPLICATED_USERNAME',
					with: u,
				};
			}

			logger.error(e);
			throw e;
		} else {
			logger.error(e);
			throw e;
		}
	}

	// Register host
	registerOrFetchInstanceDoc(host).then(i => {
		Instances.increment({ id: i.id }, 'usersCount', 1);
		instanceChart.newUser(i.host);
		fetchNodeinfo(i);
	});

	usersChart.update(user!, true);

	// ハッシュタグ更新
	updateUsertags(user!, tags);

	//#region アバターとヘッダー画像をフェッチ
	const [avatar, banner] = await Promise.all([
		person.icon,
		person.image
	].map(img =>
		img == null
			? Promise.resolve(null)
			: resolveImage(user!, img).catch(() => null)
	));

	const avatarId = avatar ? avatar.id : null;
	const bannerId = banner ? banner.id : null;

	await Users.update(user!.id, {
		avatarId,
		bannerId,
	});

	user!.avatarId = avatarId;
	user!.bannerId = bannerId;
	//#endregion

	//#region カスタム絵文字取得
	const emojis = await extractEmojis(person.tag || [], host).catch(e => {
		logger.info(`extractEmojis: ${e}`);
		return [] as Emoji[];
	});

	const emojiNames = emojis.map(emoji => emoji.name);

	await Users.update(user!.id, {
		emojis: emojiNames
	});
	//#endregion

	await updateFeatured(user!.id, resolver).catch(err => logger.error(err));

	return user!;
}

/**
 * Personの情報を更新します。
 * Misskeyに対象のPersonが登録されていなければ無視します。
 * @param uri URI of Person
 * @param resolver Resolver
 * @param hint Hint of Person object (この値が正当なPersonの場合、Remote resolveをせずに更新に利用します)
 */
export async function updatePerson(uri: string, resolver?: Resolver | null, hint?: object): Promise<void> {
	if (typeof uri !== 'string') throw new Error('uri is not string');

	// URIがこのサーバーを指しているならスキップ
	if (isSelfOrigin(uri)) {
		return;
	}

	//#region このサーバーに既に登録されているか
	const exist = await Users.findOne({ uri }) as IRemoteUser;

	if (exist == null) {
		return;
	}
	//#endregion

	if (resolver == null) resolver = new Resolver();

	const object = hint || await resolver.resolve(uri) as any;

	const person = validateActor(object, uri);

	logger.info(`Updating the Person: ${person.id}`);

	// アバターとヘッダー画像をフェッチ
	const [avatar, banner] = await Promise.all([
		person.icon,
		person.image
	].map(img =>
		img == null
			? Promise.resolve(null)
			: resolveImage(exist, img).catch(() => null)
	));

	// カスタム絵文字取得
	const emojis = await extractEmojis(person.tag || [], exist.host).catch(e => {
		logger.info(`extractEmojis: ${e}`);
		return [] as Emoji[];
	});

	const emojiNames = emojis.map(emoji => emoji.name);

	const { fields } = analyzeAttachments(person.attachment || []);

	const tags = extractApHashtags(person.tag).map(tag => normalizeTag(tag)).splice(0, 32);

	const movedTo = (person.id && person.movedTo)
		? await resolveAnotherUser(person.id, person.movedTo, resolver)
			.catch(e => {
				logger.warn(`Error in movedTo: ${e}`);
				return null;
			})
		: null;

	const updates = {
		lastFetchedAt: new Date(),
		inbox: person.inbox,
		sharedInbox: person.sharedInbox || (person.endpoints ? person.endpoints.sharedInbox : undefined),
		featured: person.featured,
		emojis: emojiNames,
		name: person.name ? truncate(person.name, MAX_NAME_LENGTH) : person.name,
		tags,
		isBot: getApType(object) === 'Service',
		isCat: (person as any).isCat === true,
		isLocked: !!person.manuallyApprovesFollowers,
		isIndexable: !(person.indexable === false),
		isExplorable: !!person.discoverable,
		movedToUserId: movedTo?.id || null,
	} as Partial<User>;

	if (avatar) {
		updates.avatarId = avatar.id;
	}

	if (banner) {
		updates.bannerId = banner.id;
	}

	// Update user
	await Users.update(exist.id, updates);

	if (person.publicKey) {
		await UserPublickeys.update({ userId: exist.id }, {
			keyId: person.publicKey.id,
			keyPem: person.publicKey.publicKeyPem
		});
	}

	await UserProfiles.update({ userId: exist.id }, {
		url: person.url,
		fields,
		description: person.summary ? htmlToMfm(truncate(person.summary, MAX_SUMMARY_LENGTH), person.tag) : null,
		twitterUserId: null,
		twitterScreenName: null,
		githubId: null,
		githubLogin: null,
		discordId: null,
		discordUsername: null,
		discordDiscriminator: null,
	});

	// ハッシュタグ更新
	updateUsertags(exist, tags);

	// 該当ユーザーが既にフォロワーになっていた場合はFollowingもアップデートする
	await Followings.update({
		followerId: exist.id
	}, {
		followerSharedInbox: person.sharedInbox || (person.endpoints ? person.endpoints.sharedInbox : undefined)
	});

	await updateFeatured(exist.id, resolver).catch(err => logger.error(err));
}

/**
 * Personを解決します。
 *
 * Misskeyに対象のPersonが登録されていればそれを返し、そうでなければ
 * リモートサーバーからフェッチしてMisskeyに登録しそれを返します。
 */
export async function resolvePerson(uri: string, resolver?: Resolver): Promise<User> {
	if (typeof uri !== 'string') throw new Error('uri is not string');

	//#region このサーバーに既に登録されていたらそれを返す
	const exist = await fetchPerson(uri);

	if (exist) {
		return exist;
	}
	//#endregion

	// リモートサーバーからフェッチしてきて登録
	if (resolver == null) resolver = new Resolver();

	try {
		return await createPerson(uri, resolver);
	} catch (e) {
		if (e.code === 'DUPLICATED_USERNAME') {
			// uriからresolveしたユーザーを作成しようとしたら同じ @username@host が既に存在した場合にここに来る
			const existUser = e.with as IRemoteUser;
			logger.warn(`Duplicated username. input(uri=${uri}) exist(uri=${existUser.uri} username=${existUser.username}, host=${existUser.host})`);

			// WebFinger(@username@host)からresync をトリガする (24時間以上古い場合)
			resolveUser(existUser.username, existUser.host);
		}

		throw e;
	}
}

export function analyzeAttachments(attachments: IObject | IObject[] | undefined) {
	const fields: {
		name: string,
		value: string
	}[] = [];
	const services: { [x: string]: any } = {};

	return { fields, services };
}

export async function updateFeatured(userId: User['id'], resolver?: Resolver) {
	const user = await Users.findOne(userId).then(ensure);
	if (!Users.isRemoteUser(user)) return;
	if (!user.featured) return;

	logger.info(`Updating the featured: ${user.uri}`);

	if (resolver == null) resolver = new Resolver();

	// Resolve to (Ordered)Collection Object
	const collection = await resolver.resolveCollection(user.featured);
	if (!isCollectionOrOrderedCollection(collection)) throw new Error(`Object is not Collection or OrderedCollection`);

	// Resolve to Object(may be Note) arrays
	const unresolvedItems = isCollection(collection) ? collection.items : collection.orderedItems;
	const items = await Promise.all(toArray(unresolvedItems).map(x => resolver.resolve(x)));

	// Resolve and regist Notes
	const limit = promiseLimit<Note | null>(2);
	const featuredNotes = await Promise.all(items
		.filter(item => getApType(item) === 'Note')	// TODO: Noteでなくてもいいかも
		.slice(0, 5)
		.map(item => limit(() => resolveNote(item, resolver))));

	await getConnection().transaction(async transactionalEntityManager => {
		await transactionalEntityManager.delete(UserNotePining, { userId: user.id });

		// とりあえずidを別の時間で生成して順番を維持
		let td = 0;
		for (const note of featuredNotes.filter(note => note != null)) {
			td -= 1000;
			transactionalEntityManager.insert(UserNotePining, {
				id: genId(new Date(Date.now() + td)),
				createdAt: new Date(),
				userId: user.id,
				noteId: note!.id
			});
		}
	});
}
