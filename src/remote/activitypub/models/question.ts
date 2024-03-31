import config from '../../../config';
import Resolver from '../resolver';
import { IObject, IQuestion, isQuestion,  } from '../type';
import { apLogger } from '../logger';
import { Notes, Polls } from '../../../models';
import { IPoll } from '../../../models/entities/poll';
import { isSelfOrigin } from '../../../misc/convert-host';

export async function extractPollFromQuestion(source: string | IObject, resolver?: Resolver): Promise<IPoll> {
	if (resolver == null) resolver = new Resolver();

	const question = await resolver.resolve(source);

	if (!isQuestion(question)) {
		throw new Error('invalid type');
	}

	const multiple = !question.oneOf;
	const expiresAt = question.endTime ? new Date(question.endTime) : question.closed ? new Date(question.closed) : null;

	if (multiple && !question.anyOf) {
		throw new Error('invalid question');
	}

	const choices = question[multiple ? 'anyOf' : 'oneOf']!
		.map((x, i) => x.name!);

	const votes = question[multiple ? 'anyOf' : 'oneOf']!
		.map((x, i) => x.replies && x.replies.totalItems || x._misskey_votes || 0);

	return {
		choices,
		votes,
		multiple,
		expiresAt
	};
}

/**
 * Update votes of Question
 * @param uri URI of AP Question object
 * @returns true if updated
 */
export async function updateQuestion(value: any, resolver?: Resolver) {
	const uri = typeof value == 'string' ? value : value.id;

	// URIがこのサーバーを指しているならスキップ
	if (isSelfOrigin(uri)) throw new Error('uri points local');

	//#region このサーバーに既に登録されているか
	const note = await Notes.findOne({ uri });
	if (note == null) throw new Error('Question is not registed');

	const poll = await Polls.findOne({ noteId: note.id });
	if (poll == null) throw new Error('Question is not registed');
	//#endregion

	// resolve new Question object
	if (resolver == null) resolver = new Resolver();
	const question = await resolver.resolve(value) as IQuestion;
	apLogger.debug(`fetched question: ${JSON.stringify(question, null, 2)}`);

	if (question.type !== 'Question') throw new Error('object is not a Question');

	const apChoices = question.oneOf || question.anyOf;

	let changed = false;

	for (const choice of poll.choices) {
		const oldCount = poll.votes[poll.choices.indexOf(choice)];
		const newCount = apChoices!.filter(ap => ap.name === choice)[0].replies!.totalItems;

		if (oldCount != newCount) {
			changed = true;
			poll.votes[poll.choices.indexOf(choice)] = newCount;
		}
	}

	await Polls.update({ noteId: note.id }, {
		votes: poll.votes
	});

	return changed;
}
