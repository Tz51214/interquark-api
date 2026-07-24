import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationPreferences1784931501499 implements MigrationInterface {
    name = 'AddNotificationPreferences1784931501499'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "features"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "notificationPreferences" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "notificationPreferences"`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD "features" text`);
    }

}
