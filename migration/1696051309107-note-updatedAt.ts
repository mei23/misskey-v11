import {MigrationInterface, QueryRunner} from "typeorm";

export class noteUpdatedAt1696051309107 implements MigrationInterface {
    name = 'noteUpdatedAt1696051309107'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "note" ADD "updatedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`COMMENT ON COLUMN "note"."updatedAt" IS 'The updated date of the Note.'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "note"."updatedAt" IS 'The updated date of the Note.'`);
        await queryRunner.query(`ALTER TABLE "note" DROP COLUMN "updatedAt"`);
    }

}
