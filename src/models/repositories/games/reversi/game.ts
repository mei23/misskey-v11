import { EntityRepository, Repository } from 'typeorm';
import { Users } from '../../..';
import { ReversiGame } from '../../../entities/games/reversi/game';
import { ensure } from '../../../../prelude/ensure';

@EntityRepository(ReversiGame)
export class ReversiGameRepository extends Repository<ReversiGame> {
	public async pack(
		src: ReversiGame['id'] | ReversiGame,
		me?: any,
		options?: {
			detail?: boolean
		}
	) {
		const opts = Object.assign({
			detail: true
		}, options);

		const game = typeof src === 'object' ? src : await this.findOne({ id: src }).then(ensure);
		const meId = me ? typeof me === 'string' ? me : me.id : null;

		return {
			id: game.id,
			createdAt: game.createdAt,
			startedAt: game.startedAt,
			isStarted: game.isStarted,
			isEnded: game.isEnded,
			form1: game.form1,
			form2: game.form2,
			user1Accepted: game.user1Accepted,
			user2Accepted: game.user2Accepted,
			user1Id: game.user1Id,
			user2Id: game.user2Id,
			user1: await Users.pack(game.user1Id, meId),
			user2: await Users.pack(game.user2Id, meId),
			winnerId: game.winnerId,
			winner: game.winnerId ? await Users.pack(game.winnerId, meId) : null,
			surrendered: game.surrendered,
			black: game.black,
			bw: game.bw,
			isLlotheo: game.isLlotheo,
			canPutEverywhere: game.canPutEverywhere,
			loopedBoard: game.loopedBoard,
			...(opts.detail ? {
				logs: game.logs,
				map: game.map,
			} : {})
		};
	}
}
