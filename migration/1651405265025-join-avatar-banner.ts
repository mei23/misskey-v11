import {MigrationInterface, QueryRunner} from "typeorm";

export class joinAvatarBanner1651405265025 implements MigrationInterface {
    name = 'joinAvatarBanner1651405265025'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "avatarUrl"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "bannerUrl"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "avatarBlurhash"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "bannerBlurhash"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "bannerBlurhash" character varying(128)`);
        await queryRunner.query(`ALTER TABLE "user" ADD "avatarBlurhash" character varying(128)`);
        await queryRunner.query(`ALTER TABLE "user" ADD "bannerUrl" character varying(512)`);
        await queryRunner.query(`ALTER TABLE "user" ADD "avatarUrl" character varying(512)`);
    }

}
