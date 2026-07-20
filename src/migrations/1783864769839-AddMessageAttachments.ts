import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMessageAttachments1783864769839 implements MigrationInterface {
    name = 'AddMessageAttachments1783864769839'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message" ADD "attachmentUrl" character varying`);
        await queryRunner.query(`ALTER TABLE "message" ADD "attachmentName" character varying`);
        await queryRunner.query(`ALTER TABLE "message" ADD "attachmentType" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "attachmentType"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "attachmentName"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "attachmentUrl"`);
    }

}
