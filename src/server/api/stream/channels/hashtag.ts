import autobind from 'autobind-decorator';
import { pack } from '../../../../models/note';
import shouldMuteThisNote from '../../../../misc/should-mute-this-note';
import Channel from '../channel';

export default class extends Channel {
	public readonly chName = 'hashtag';
	public static requireCredential = false;

	@autobind
	public async init(params: any) {
		const q: string[][] = params.q;

		if (q == null) return;

		// Subscribe stream
		this.subscriber.on('hashtag', async note => {
			const noteTags = note.tags.map((t: string) => t.toLowerCase());
			const matched = q.some(tags => tags.every(tag => noteTags.includes(tag.toLowerCase())));
			if (!matched) return;

			// Renoteなら再pack
			if (note.renoteId != null) {
				note.renote = await pack(note.renoteId, this.user, {
					detail: true
				});
			}

			// 流れてきたNoteがミュートしているユーザーが関わるものだったら無視する
			if (shouldMuteThisNote(note, this.mutedUserIds)) return;

			this.send('note', note);
		});
	}
}
