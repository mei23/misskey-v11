import renderDocument from './document';
import renderHashtag from './hashtag';
import renderMention from './mention';
import renderEmoji from './emoji';
import config from '../../../config';
import { getNoteHtml } from '../misc/get-note-html';
import { Note, IMentionedRemoteUsers } from '../../../models/entities/note';
import { DriveFile } from '../../../models/entities/drive-file';
import { DriveFiles, Notes, Users, Emojis, Polls } from '../../../models';
import { In } from 'typeorm';
import { Emoji } from '../../../models/entities/emoji';
import { Poll } from '../../../models/entities/poll';
import { ensure } from '../../../prelude/ensure';

/**
 * Render Note object
 * @param note Note object from DB
 * @param dive Deprecated, Always ignored
 * @param isTalk isTalk
 */
export default async function renderNote(note: Note, dive = true, isTalk = false): Promise<any> {
	const getPromisedFiles = async (ids: string[]) => {
		if (!ids || ids.length === 0) return [];
		const items = await DriveFiles.find({ id: In(ids) });
		return ids.map(id => items.find(item => item.id === id)).filter(item => item != null) as DriveFile[];
	};

	let inReplyTo: string | null;

	if (note.replyId) {
		const inReplyToNote = note.reply || await Notes.findOne(note.replyId);
		inReplyTo = inReplyToNote ? (inReplyToNote.uri || `${config.url}/notes/${inReplyToNote.id}`) : null;
	}

	let quote;

	if (note.renoteId) {
		const renote = await Notes.findOne(note.renoteId);

		if (renote) {
			quote = renote.uri ? renote.uri : `${config.url}/notes/${renote.id}`;
		}
	}

	const user = await Users.findOne(note.userId).then(ensure);

	const attributedTo = `${config.url}/users/${user.id}`;

	const mentions = (JSON.parse(note.mentionedRemoteUsers) as IMentionedRemoteUsers).map(x => x.uri);

	let to: string[] = [];
	let cc: string[] = [];

	if (note.visibility == 'public') {
		to = ['https://www.w3.org/ns/activitystreams#Public'];
		cc = [`${attributedTo}/followers`].concat(mentions);
	} else if (note.visibility == 'home') {
		to = [`${attributedTo}/followers`];
		cc = ['https://www.w3.org/ns/activitystreams#Public'].concat(mentions);
	} else if (note.visibility == 'followers') {
		to = [`${attributedTo}/followers`];
		cc = mentions;
	} else {
		to = mentions;
	}

	const mentionedUsers = note.mentions.length > 0 ? await Users.find({
		id: In(note.mentions)
	}) : [];

	const hashtagTags = (note.tags || []).map(tag => renderHashtag(tag));
	const mentionTags = mentionedUsers.map(u => renderMention(u));

	const files = await getPromisedFiles(note.fileIds);

	let text = note.text;
	let poll: Poll | undefined;

	if (note.hasPoll) {
		poll = await Polls.findOne({ noteId: note.id });
	}

	let apAppend = '';

	if (quote) {
		apAppend += `\n\nRE: ${quote}`;
	}

	const summary = note.cw === '' ? String.fromCharCode(0x200B) : note.cw;

	const { content, noMisskeyContent } = getNoteHtml(note, apAppend);

	const emojis = await getEmojis(note.emojis);
	const apemojis = emojis.map(emoji => renderEmoji(emoji));

	const tag = [
		...hashtagTags,
		...mentionTags,
		...apemojis,
	];

	const asPoll = poll ? {
		type: 'Question',
		_misskey_fallback_content: content,
		[poll.expiresAt && poll.expiresAt < new Date() ? 'closed' : 'endTime']: poll.expiresAt,
		[poll.multiple ? 'anyOf' : 'oneOf']: poll.choices.map((text, i) => ({
			type: 'Note',
			name: text,
			replies: {
				type: 'Collection',
				totalItems: poll!.votes[i]
			}
		}))
	} : {};

	const asTalk = isTalk ? {
		_misskey_talk: true
	} : {};

	return {
		id: `${config.url}/notes/${note.id}`,
		type: 'Note',
		attributedTo,
		summary,
		content,
		...(noMisskeyContent ? {} : { _misskey_content: text }),
		_misskey_quote: quote,
		quoteUrl: quote,
		published: note.createdAt.toISOString(),
		to,
		cc,
		inReplyTo,
		attachment: files.map(renderDocument),
		sensitive: note.cw != null || files.some(file => file.isSensitive),
		tag,
		...asPoll,
		...asTalk
	};
}

export async function getEmojis(names: string[]): Promise<Emoji[]> {
	if (names == null || names.length === 0) return [];

	const emojis = await Promise.all(
		names.map(name => Emojis.findOne({
			name,
			host: null
		}))
	);

	return emojis.filter(emoji => emoji != null) as Emoji[];
}
