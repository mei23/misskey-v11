import {MigrationInterface, QueryRunner} from "typeorm";

export class movedTo1652878170000 implements MigrationInterface {
	name = 'movedTo1652878170000'

	public async up(queryRunner: QueryRunner): Promise<void> {
			await queryRunner.query(`ALTER TABLE "user" ADD "movedToUserId" character varying(32)`);
			await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_81126443ddd4dc1291f2e764da7" FOREIGN KEY ("movedToUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
			await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_81126443ddd4dc1291f2e764da7"`);
			await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "movedToUserId"`);
	}
}
