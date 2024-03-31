import { EntityRepository, Repository } from 'typeorm';
import { NoteReaction } from '../entities/note-reaction';
import { Users } from '..';
import { ensure } from '../../prelude/ensure';
import { SchemaType } from '../../misc/schema';

export type PackedNoteReaction = SchemaType<typeof packedNoteReactionSchema>;

@EntityRepository(NoteReaction)
export class NoteReactionRepository extends Repository<NoteReaction> {
	public async pack(
		src: NoteReaction['id'] | NoteReaction,
		me?: any
	): Promise<PackedNoteReaction> {
		const reaction = typeof src === 'object' ? src : await this.findOne({ id: src }).then(ensure);

		return {
			id: reaction.id,
			createdAt: reaction.createdAt.toISOString(),
			user: await Users.pack(reaction.userId, me),
			type: reaction.reaction,
		};
	}
}

export const packedNoteReactionSchema = {
	type: 'object' as const,
	optional: false as const, nullable: false as const,
	properties: {
		id: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			format: 'id',
			description: 'The unique identifier for this reaction.',
			example: 'xxxxxxxxxx',
		},
		createdAt: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			format: 'date-time',
			description: 'The date that the reaction was created.'
		},
		user: {
			type: 'object' as const,
			optional: false as const, nullable: false as const,
			ref: 'User',
			description: 'User who performed this reaction.'
		},
		type: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			description: 'The reaction type.'
		},
	},
};
