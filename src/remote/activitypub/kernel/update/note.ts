import { getApLock } from "../../../../misc/app-lock";
import { extractDbHost } from "../../../../misc/convert-host";
import { Notes } from "../../../../models";
import { IRemoteUser } from "../../../../models/entities/user";
import { publishNoteStream } from "../../../../services/stream";
import DbResolver from "../../db-resolver";
import { apLogger } from "../../logger";
import { htmlToMfm } from "../../misc/html-to-mfm";
import { IPost, getApId } from "../../type";

const logger = apLogger;

export default async function(actor: IRemoteUser, note: IPost): Promise<string> {
	if (typeof note.id !== 'string') return 'skip';

	// Note.attributedToは署名と同じである必要がある
	if (actor.uri !== note.attributedTo) {
		return `skip: actor.uri !== note.attributedTo`;
	}
	

	// Note.idのホストは署名と同一である必要がある
	if (extractDbHost(note.id) !== extractDbHost(actor.uri)) {
		return `skip: host in actor.uri !== host in note.id`;
	}
	
	const uri = getApId(note);

	logger.info(`Update the Note: ${uri}`);

	const unlock = await getApLock(uri);

	try {
		const dbResolver = new DbResolver();

		// 元ノート照合
		const origin = await dbResolver.getNoteFromApId(uri);
		if (!origin) return 'skip: old note is not found';

		// 同じユーザーである必要がある
		if (!(origin.userId === actor.id)) {
			return '投稿をUpdateしようとしているユーザーは投稿の作成者ではありません';
		}

		// validateはinboxのハードリミットでいい

		// テキストのパース
		const text = note._misskey_content || (note.content ? htmlToMfm(note.content, note.tag) : null);
		const cw = note.summary === '' ? null : note.summary;

		// Update
		const updates = {
			updatedAt: new Date(),
			text: text?.trim(),
			cw: cw ?? null,
		};

		await Notes.update({ id: origin.id }, updates);

		// Publish to streaming
		publishNoteStream(origin.id, 'updated', updates);
 
		return 'ok';
	} finally {
		unlock();
	}
}
