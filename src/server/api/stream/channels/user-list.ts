import autobind from 'autobind-decorator';
import Channel from '../channel';
import { pack } from '../../../../models/note';
import Mute from '../../../../models/mute';
import shouldMuteThisNote from '../../../../misc/should-mute-this-note';

export default class extends Channel {
	public readonly chName = 'userList';
	public static shouldShare = false;
	public static requireCredential = false;

	private mutedUserIds: string[] = [];

	@autobind
	public async init(params: any) {
		const listId = params.listId as string;
		const mute = this.user ? await Mute.find({ muterId: this.user._id }) : null;
		this.mutedUserIds = mute ? mute.map(m => m.muteeId.toString()) : [];

		// Subscribe stream
		this.subscriber.on(`userListStream:${listId}`, async data => {
			// 再パック
			if (data.type == 'note') data.body = await pack(data.body.id, this.user, {
				detail: true
			});

			if (data.body && data.body.isHidden) return;

			// 流れてきたNoteがミュートしているユーザーが関わるものだったら無視する
			if (data.type == 'note' && data.body && shouldMuteThisNote(data.body, this.mutedUserIds)) return;

			this.send(data);
		});
	}
}
