import { Feed } from 'feed';
import config from '../../config';
import { User } from '../../models/entities/user';
import { Notes, DriveFiles, UserProfiles } from '../../models';
import { In } from 'typeorm';
import { ensure } from '../../prelude/ensure';

export default async function(user: User) {
	const author = {
		link: `${config.url}/@${user.username}`,
		email: `${user.username}@${config.host}`,
		name: user.name || user.username
	};

	const profile = await UserProfiles.findOne(user.id).then(ensure);

	const notes = await Notes.find({
		where: {
			userId: user.id,
			//renoteId: null,
			visibility: In(['public', 'home'])
		},
		order: { createdAt: -1 },
		take: 20
	});

	const feed = new Feed({
		id: author.link,
		title: `${author.name} (@${user.username}@${config.host})`,
		updated: notes[0].createdAt,
		generator: 'Misskey',
		description: `${user.notesCount} Notes, ${user.followingCount} Following, ${user.followersCount} Followers${profile.description ? ` · ${profile.description}` : ''}`,
		link: author.link,
		image: user.avatarUrl ? user.avatarUrl : undefined,
		feedLinks: {
			json: `${author.link}.json`,
			atom: `${author.link}.atom`,
		},
		author,
		copyright: user.name || user.username
	});

	for (const note of notes) {
		let contentStr = noteToString(note);
		let next = aFind.renoteId ? aFind.renoteId : aFind.replyId;
		let depth = 5
		while(depth > 0 && next){
			let finding = findById(id);
			contentStr += finding.text;
			next = finding.next;
			depth -= 1;
		}

		feed.addItem({
			title: `${author.name} ${(note.renoteId ? 'renotes' : (note.replyId ? 'replies' : 'says'))}: ${(note.text ? note.text : 'post a new note').substring(0,50)}`,
			link: `${config.url}/notes/${note.id}`,
			date: note.createdAt,
			description: note.cw || undefined,
			content: `${note.text || ''}${fileEle} <span class="${(note.replyId ? 'reply_note' : 'new_note')} ${(fileEle.indexOf("img src") != -1 ? 'with_img' : 'without_img')}"></span>`
		});
	}
	
	function noteToString(note){
		const files = note.fileIds.length > 0 ? await DriveFiles.find({
			id: In(note.fileIds)
		}) : [];
		let fileEle = '';
		for (const file of files){
			if(file.type.startsWith('image/')){
				fileEle += ` <br><img src="${DriveFiles.getPublicUrl(file)}">`;
			}else if(file.type.startsWith('audio/')){
				fileEle += ` <br><audio controls src="${DriveFiles.getPublicUrl(file)}" type="${file.type}">`;
			}else if(file.type.startsWith('video/')){
				fileEle += ` <br><video controls src="${DriveFiles.getPublicUrl(file)}" type="${file.type}">`;
			}else{
				fileEle += ` <br><a href="${DriveFiles.getPublicUrl(file)}" download="${file.name}">${file.name}</a>`;
			}
		}
		return `${note.text || ''}${fileEle} <span class="${(note.replyId ? 'reply_note' : 'new_note')} ${(fileEle.indexOf("img src") != -1 ? 'with_img' : 'without_img')}"></span>`;
	}
	
	function findById(id){
		let text = "";
		let next = null;
		const findings = await Notes.find({where: {userId: id, visibility: In(['public', 'home'])}, order: { createdAt: -1 }, take: 20});
		for (const aFind of findings){
			text += `<hr>`;
			text += noteToString(aFind);
			next = aFind.renoteId ? aFind.renoteId : aFind.replyId;
		}
		return {text: text, next: next};
	}

	return feed;
}
