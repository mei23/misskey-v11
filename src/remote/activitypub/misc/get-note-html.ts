import { Note } from '../../../models/entities/note';
import { toHtml } from '../../../mfm/toHtml';
import { parse } from '../../../mfm/parse';

export function getNoteHtml(note: Note, apAppend?: string) {
	let noMisskeyContent = false;
	const srcMfm = (note.text ?? '') + (apAppend ?? '');

	const parsed = parse(srcMfm);

	if (!apAppend && parsed?.every(n => ['text', 'emoji', 'mention', 'hashtag', 'url'].includes(n.node.type))) {
		noMisskeyContent = true;
	}

	let html = toHtml(parsed, JSON.parse(note.mentionedRemoteUsers));
	if (html == null) html = '<p>.</p>';

	return {
		content: html,
		noMisskeyContent,
	};
}
