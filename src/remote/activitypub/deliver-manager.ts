import { isRemoteUser, IRemoteUser, IUser, isLocalUser, ILocalUser } from '../../models/user';
import Following from '../../models/following';
import { deliver } from '../../queue';

//#region types
interface IQueue {
	type: string;
}

interface IFollowersQueue extends IQueue {
	type: 'Followers';
}

interface IDirectQueue extends IQueue {
	type: 'Direct';
	to: IRemoteUser;
}

const isFollowers = (queue: any): queue is IFollowersQueue =>
	queue.type === 'Followers';

const isDirect = (queue: any): queue is IDirectQueue =>
	queue.type === 'Direct';
//#endregion

export default class DeliverManager {
	private actor: IUser;
	private activity: any;
	private queues: IQueue[] = [];

	/**
	 * Constructor
	 * @param actor Actor
	 * @param activity Activity to send
	 */
	constructor(actor: IUser, activity: any) {
		this.actor = actor;
		this.activity = activity;
	}

	/**
	 * Add queue for followers deliver
	 */
	public addFollowersQueue() {
		const deliver = {
			type: 'Followers'
		} as IFollowersQueue;

		this.addQueue(deliver);
	}

	/**
	 * Add queue for direct deliver
	 * @param to To
	 */
	public addDirectQueue(to: IRemoteUser) {
		const queue = {
			type: 'Direct',
			to
		} as IDirectQueue;

		this.addQueue(queue);
	}

	/**
	 * Add queue
	 * @param queue Queue
	 */
	public addQueue(queue: IQueue) {
		this.queues.push(queue);
	}

	/**
	 * Execute delivers
	 */
	public async execute() {
		if (!isLocalUser(this.actor)) return;

		const inboxes: string[] = [];

		// build inbox list
		for (const queue of this.queues) {
			if (isFollowers(queue)) {
				// followers deliver
				const followers = await Following.find({
					followeeId: this.actor._id
				});

				for (const following of followers) {
					const follower = following._follower;

					if (isRemoteUser(follower)) {
						const inbox = follower.sharedInbox || follower.inbox;
						if (!inboxes.includes(inbox)) inboxes.push(inbox);
					}
				}
			} else if (isDirect(queue)) {
				// direct deliver
				const inbox = queue.to.inbox;
				if (!inboxes.includes(inbox)) inboxes.push(inbox);
			}
		}

		// deliver
		for (const inbox of inboxes) {
			deliver(this.actor, this.activity, inbox);
		}
	}
}

//#region Utilities
/**
 * Deliver activity to followers
 * @param activity Activity
 * @param from Followee
 */
export async function deliverToFollowers(actor: ILocalUser, activity: any) {
	const deliverer = new DeliverManager(actor, activity);
	deliverer.addFollowersQueue();
	await deliverer.execute();
}

/**
 * Deliver activity to user
 * @param activity Activity
 * @param to Target user
 */
export async function deliverToUser(actor: ILocalUser, activity: any, to: IRemoteUser) {
	const deliverer = new DeliverManager(actor, activity);
	deliverer.addDirectQueue(to);
	await deliverer.execute();
}
//#endregion
