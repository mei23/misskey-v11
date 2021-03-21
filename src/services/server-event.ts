import { User } from '../models/entities/user';
import { publishServerEvent } from './stream';

export async function publishFollowingChanged(userId: User['id']) {
	await publishServerEvent(userId, 'followingChanged');
}

export async function publishMutingChanged(userId: User['id']) {
	await publishServerEvent(userId, 'mutingChanged');
}

export async function publishTerminate(userId: User['id']) {
	await publishServerEvent(userId, 'terminate');
}

export async function publishInstanceModUpdated() {
	await publishServerEvent(null, 'instanceModUpdated');
}

export async function publishEmojiUpdated(name: string, host: string | null) {
	await publishServerEvent(null, 'emojiUpdated', { name, host });
}
