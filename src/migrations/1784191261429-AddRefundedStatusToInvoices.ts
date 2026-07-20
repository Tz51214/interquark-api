import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRefundedStatusToInvoices1784191261429 implements MigrationInterface {
    name = 'AddRefundedStatusToInvoices1784191261429'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."orders_status_enum" RENAME TO "orders_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'active', 'completed', 'cancelled', 'refunded')`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."orders_status_enum" USING "status"::"text"::"public"."orders_status_enum"`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."invoices_status_enum" RENAME TO "invoices_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."invoices_status_enum" AS ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "status" TYPE "public"."invoices_status_enum" USING "status"::"text"::"public"."invoices_status_enum"`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'draft'`);
        await queryRunner.query(`DROP TYPE "public"."invoices_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."invoices_status_enum_old" AS ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "status" TYPE "public"."invoices_status_enum_old" USING "status"::"text"::"public"."invoices_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'draft'`);
        await queryRunner.query(`DROP TYPE "public"."invoices_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."invoices_status_enum_old" RENAME TO "invoices_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum_old" AS ENUM('pending', 'active', 'completed', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."orders_status_enum_old" USING "status"::"text"::"public"."orders_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."orders_status_enum_old" RENAME TO "orders_status_enum"`);
    }

}
