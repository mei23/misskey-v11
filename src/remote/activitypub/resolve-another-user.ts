import Resolver from './resolver';
import { getApId, IObject } from './type';
import { resolvePerson } from './models/person';

/**
 * Resolve user with loop detection
 * @param selfUri Origin AP Actor id
 * @param target Target
 * @param resolver Resolver
 * @returns Remote/Local user as DB object
 */
export async function resolveAnotherUser(selfUri: string, target: string | IObject | undefined, resolver: Resolver) {
	if (target == null) return null;

	const targetUri = getApId(target);

	if (selfUri === targetUri) {
		throw new Error(`target is self ${selfUri}`);
	}

	const user = await resolvePerson(targetUri, resolver)
		.catch(e => {
			throw new Error(`failed to resolvePerson ${selfUri} => ${targetUri}, ${e}`);
		});

	if (selfUri === user?.uri) {
		throw new Error(`result is self ${selfUri}`);
	}

	return user;
}
