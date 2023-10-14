import { MigrationInterface, QueryRunner } from "typeorm";

export class IndexNotesMentionsPartial1697272359966 implements MigrationInterface {
	name = 'IndexNotesMentionsPartial1697272359966'
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`CREATE INDEX "IDX_NOTE_MENTIONS_P" ON "note" USING gin ("mentions") WHERE "note"."mentions" <> '{}'`);
		await queryRunner.query(`DROP INDEX "IDX_NOTE_MENTIONS"`, undefined);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`CREATE INDEX "IDX_NOTE_MENTIONS" ON "note" USING gin ("mentions")`, undefined);
		await queryRunner.query(`DROP INDEX "IDX_NOTE_MENTIONS_P"`, undefined);
	}
}
