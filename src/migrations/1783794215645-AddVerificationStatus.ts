import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVerificationStatus1783794215645 implements MigrationInterface {
    name = 'AddVerificationStatus1783794215645'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_verificationstatus_enum" AS ENUM('pending', 'verified', 'rejected')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "verificationStatus" "public"."users_verificationstatus_enum" NOT NULL DEFAULT 'verified'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "verificationStatus"`);
        await queryRunner.query(`DROP TYPE "public"."users_verificationstatus_enum"`);
    }

}
