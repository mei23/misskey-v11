import {MigrationInterface, QueryRunner} from "typeorm";

export class isIndexable1695595746908 implements MigrationInterface {
    name = 'isIndexable1695595746908'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "isIndexable" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`COMMENT ON COLUMN "user"."isIndexable" IS 'Search indexable.'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "user"."isIndexable" IS 'Search indexable.'`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isIndexable"`);
    }

}
