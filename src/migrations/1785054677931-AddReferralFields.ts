import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReferralFields1785054677931 implements MigrationInterface {
    name = 'AddReferralFields1785054677931'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "referralCode" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_b7f8278f4e89249bb75c9a15899" UNIQUE ("referralCode")`);
        await queryRunner.query(`ALTER TABLE "users" ADD "referredByUserId" integer`);
        await queryRunner.query(`ALTER TABLE "users" ADD "referralRewarded" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referralRewarded"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referredByUserId"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_b7f8278f4e89249bb75c9a15899"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referralCode"`);
    }

}
