import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubscriptionBillingFields1783770065361 implements MigrationInterface {
    name = 'AddSubscriptionBillingFields1783770065361'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD "trialEndsAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD "currentPeriodEnd" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD "discountCode" character varying`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD "discountPercent" numeric(5,2)`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD "cancelledAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD "cancelReason" text`);
        await queryRunner.query(`ALTER TABLE "payment_records" ADD "subscriptionId" integer`);
        await queryRunner.query(`ALTER TYPE "public"."subscriptions_status_enum" RENAME TO "subscriptions_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."subscriptions_status_enum" AS ENUM('active', 'trialing', 'past_due', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "status" TYPE "public"."subscriptions_status_enum" USING "status"::"text"::"public"."subscriptions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DEFAULT 'active'`);
        await queryRunner.query(`DROP TYPE "public"."subscriptions_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "payment_records" ADD CONSTRAINT "FK_e7323ea2aaa34d03b1fdb906ec6" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment_records" DROP CONSTRAINT "FK_e7323ea2aaa34d03b1fdb906ec6"`);
        await queryRunner.query(`CREATE TYPE "public"."subscriptions_status_enum_old" AS ENUM('active', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "status" TYPE "public"."subscriptions_status_enum_old" USING "status"::"text"::"public"."subscriptions_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DEFAULT 'active'`);
        await queryRunner.query(`DROP TYPE "public"."subscriptions_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."subscriptions_status_enum_old" RENAME TO "subscriptions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "payment_records" DROP COLUMN "subscriptionId"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "cancelReason"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "cancelledAt"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "discountPercent"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "discountCode"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "currentPeriodEnd"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "trialEndsAt"`);
    }

}
