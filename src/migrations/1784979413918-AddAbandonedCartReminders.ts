import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAbandonedCartReminders1784979413918 implements MigrationInterface {
    name = 'AddAbandonedCartReminders1784979413918'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "signupReminderSentAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "reminderSentAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "reminderSentAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "signupReminderSentAt"`);
    }

}
