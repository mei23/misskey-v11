import config from '../../../config';
import { ILocalUser } from '../../../models/user';
import { INote } from '../../../models/note';

export default (user: ILocalUser, note: INote, reaction: string) => {
	if (generalMap[reaction]) reaction = generalMap[reaction];
	return {
		type: 'Like',
		actor: `${config.url}/users/${user._id}`,
		object: note.uri ? note.uri : `${config.url}/notes/${note._id}`,
		content: reaction,
		_misskey_reaction: reaction
	};
};

const generalMap: Record<string, string> = {
	'like': '👍',
	'love': '❤',	// ここに記述する場合は異体字セレクタを入れない
	'laugh': '😆',
	'hmm': '🤔',
	'surprise': '😮',
	'congrats': '🎉',
	'angry': '💢',
	'confused': '😥',
	'rip': '😇',
	'pudding': '🍮',
	'star': '⭐',
};
