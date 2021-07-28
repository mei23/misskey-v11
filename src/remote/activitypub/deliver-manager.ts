import { Users, Followings } from '../../models';
import { ILocalUser, IRemoteUser } from '../../models/entities/user';
import { deliver } from '../../queue';
import { isBlockedHost, isClosedHost } from '../../services/instance-moderation';

//#region types
interface IRecipe {
	type: string;
}

interface IFollowersRecipe extends IRecipe {
	type: 'Followers';
}

interface IDirectRecipe extends IRecipe {
	type: 'Direct';
	to: IRemoteUser;
}

const isFollowers = (recipe: any): recipe is IFollowersRecipe =>
	recipe.type === 'Followers';

const isDirect = (recipe: any): recipe is IDirectRecipe =>
	recipe.type === 'Direct';
//#endregion

export default class DeliverManager {
	private actor: ILocalUser;
	private activity: any;
	private recipes: IRecipe[] = [];

	/**
	 * Constructor
	 * @param actor Actor
	 * @param activity Activity to deliver
	 */
	constructor(actor: ILocalUser, activity: any) {
		this.actor = actor;
		this.activity = activity;
	}

	/**
	 * Add recipe for followers deliver
	 */
	public addFollowersRecipe() {
		const deliver = {
			type: 'Followers'
		} as IFollowersRecipe;

		this.addRecipe(deliver);
	}

	/**
	 * Add recipe for direct deliver
	 * @param to To
	 */
	public addDirectRecipe(to: IRemoteUser) {
		const recipe = {
			type: 'Direct',
			to
		} as IDirectRecipe;

		this.addRecipe(recipe);
	}

	/**
	 * Add recipe
	 * @param recipe Recipe
	 */
	public addRecipe(recipe: IRecipe) {
		this.recipes.push(recipe);
	}

	/**
	 * Execute delivers
	 */
	public async execute() {
		if (!Users.isLocalUser(this.actor)) return;

		const inboxes: string[] = [];

		// build inbox list
		for (const recipe of this.recipes) {
			if (isFollowers(recipe)) {
				// followers deliver
				const followers = await Followings.find({
					followeeId: this.actor.id
				});

				for (const following of followers) {
					if (Followings.isRemoteFollower(following)) {
						const inbox = following.followerSharedInbox || following.followerInbox;
						if (!inboxes.includes(inbox)) inboxes.push(inbox);
					}
				}
			} else if (isDirect(recipe)) {
				// direct deliver
				const inbox = recipe.to.inbox;
				if (inbox && !inboxes.includes(inbox)) inboxes.push(inbox);
			}
		}

		// deliver
		for (const inbox of inboxes) {
			if (inbox == null) {
				continue;
			} else if (!inbox.match(/^https?:/)) {
				continue;
			} else {
				try {
					const { host } = new URL(inbox);
					if (await isBlockedHost(host)) continue;
					if (await isClosedHost(host)) continue;
					deliver(this.actor, this.activity, inbox);
				} catch { }
			}
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
	const manager = new DeliverManager(actor, activity);
	manager.addFollowersRecipe();
	await manager.execute();
}

/**
 * Deliver activity to user
 * @param activity Activity
 * @param to Target user
 */
export async function deliverToUser(actor: ILocalUser, activity: any, to: IRemoteUser) {
	const manager = new DeliverManager(actor, activity);
	manager.addDirectRecipe(to);
	await manager.execute();
}
//#endregion
