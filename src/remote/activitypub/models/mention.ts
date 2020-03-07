import { toArray, unique } from '../../../prelude/array';
import { IObject, isMention } from '../type';
import { resolvePerson } from './person';
import * as promiseLimit from 'promise-limit';
import { IUser } from '../../../models/user';
import Resolver from '../resolver';

export async function extractApMentions(tags: IObject | IObject[] | null | undefined) {
	if (tags == null) return [];

	const hrefs = unique(toArray(tags).filter(isMention).map(x => x.href));

	const resolver = new Resolver();

	const limit = promiseLimit<IUser | null>(4);
	const mentionedUsers = (await Promise.all(
		hrefs.map(x => limit(() => resolvePerson(x, null, resolver).catch(() => null)))
	)).filter((x): x is IUser => x != null);

	return mentionedUsers;
}
