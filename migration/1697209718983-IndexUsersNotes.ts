import { MigrationInterface, QueryRunner } from "typeorm";

export class IndexUsersNotes1697209718983 implements MigrationInterface {
	name = 'IndexUsersNotes1697209718983'

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`CREATE INDEX "IDX_note_on_userId_and_id_desc" ON "note" ("userId", "id" desc)`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX "IDX_note_on_userId_and_id_desc"`);
	}
}
