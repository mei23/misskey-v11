import * as mongo from 'mongodb';
import config from '../../config';
import User, { IUser, IRemoteUser } from '../../models/user';
import Note, { INote } from '../../models/note';
import { IObject, getApId } from './type';
import * as escapeRegexp from 'escape-regexp';
import { inspect } from 'util';

export default class ApResolver {
	constructor() {
	}

	/**
	 * AP Note => Misskey Note in DB
	 * @param object AP object
	 */
	public async getNoteFromObject(object: string | IObject): Promise<INote | null> {
		const parsed = this.parseObjectUri(object);

		if (parsed.id) {
			return (await Note.findOne({
				_id: new mongo.ObjectID(parsed.id),
				deletedAt: { $exists: false }
			})) || null;
		}

		if (parsed.uri) {
			return (await Note.findOne({
				uri: parsed.uri,
				deletedAt: { $exists: false }
			})) || null;
		}

		return null;
	}

	public async getRemoteUserFromKeyId(keyId: string): Promise<IRemoteUser | null> {
		const user = await User.findOne({
			host: { $ne: null },
			'publicKey.id': keyId,
			deletedAt: { $exists: false }
		}) as IRemoteUser;

		return user || null;
	}

	/**
	 * AP Person => Misskey User in DB
	 * @param object AP Object
	 */
	public async getUserFromObject(object: string | IObject): Promise<IUser | null> {
		const parsed = this.parseObjectUri(object);

		console.log(inspect(parsed));
		if (parsed.id) {
			return (await User.findOne({
				_id: new mongo.ObjectID(parsed.id),
				deletedAt: { $exists: false }
			})) || null;
		}

		if (parsed.uri) {
			return (await User.findOne({
				uri: parsed.uri,
				deletedAt: { $exists: false }
			})) || null;
		}

		return null;
	}

	public parseObjectUri(object: string | IObject): UriParseResult {
		const uri = getApId(object);

		const localRegex = new RegExp('^' + escapeRegexp(config.url) + '/' + '(\\w+)' + '/' + '(\\w+)');
		const matchLocal = uri.match(localRegex);

		if (matchLocal) {
			return {
				type: matchLocal[1],
				id: matchLocal[2]
			};
		} else {
			return {
				uri
			};
		}
	}
}

type UriParseResult = {
	/** id in DB (local object only) */
	id?: string;
	/** uri in DB (remote object only) */
	uri?: string;
	/** hint of type (local object only, ex: notes, users) */
	type?: string
};
