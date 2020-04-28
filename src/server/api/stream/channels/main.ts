import autobind from 'autobind-decorator';
import Channel from '../channel';

export default class extends Channel {
	public readonly chName = 'main';
	public static requireCredential = true;

	@autobind
	public async init(params: any) {
		// Subscribe main stream channel
		this.subscriber.on(`mainStream:${this.user._id}`, async data => {
			const { type, body } = data;

			switch (type) {
				case 'notification': {
					if (this.mutedUserIds.includes(body.userId)) return;
					if (body.note && body.note.isHidden) return;
					break;
				}
				case 'mention': {
					if (this.mutedUserIds.includes(body.userId)) return;
					if (body.isHidden) return;
					break;
				}
			}

			this.send(type, body);
		});
	}
}
