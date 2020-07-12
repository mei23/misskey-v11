import autobind from 'autobind-decorator';
import Channel from '../channel';

export default class extends Channel {
	public readonly chName = 'notesStats';
	public static shouldShare = true;
	public static requireCredential = false;

	private stats = {
		all: 0,
		local: 0,
	};

	private timerId: any;

	@autobind
	public async init(params: any) {
		this.subscriber.on('notesStream', this.onNote);
		this.timerId = setInterval(this.onStats, 3000);
	}

	@autobind
	private onNote(note: any) {
		this.stats.all++;
		if (note.user.host == null) this.stats.local++;
	}

	@autobind
	private onStats() {
		this.send('stats', this.stats);

		this.stats = {
			all: 0,
			local: 0,
		};
	}

	@autobind
	public onMessage(type: string, body: any) {
		switch (type) {
			case 'requestLog':
				this.send('statsLog', []);
				break;
		}
	}

	@autobind
	public dispose() {
		if (this.timerId) clearInterval(this.timerId);
		this.subscriber.off('notesStream', this.onNote);
	}
}
