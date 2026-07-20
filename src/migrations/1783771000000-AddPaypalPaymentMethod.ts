import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaypalPaymentMethod1783771000000 implements MigrationInterface {
    name = 'AddPaypalPaymentMethod1783771000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."payment_records_method_enum" RENAME TO "payment_records_method_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."payment_records_method_enum" AS ENUM('stripe', 'paypal', 'bank_transfer', 'manual')`);
        await queryRunner.query(`ALTER TABLE "payment_records" ALTER COLUMN "method" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payment_records" ALTER COLUMN "method" TYPE "public"."payment_records_method_enum" USING "method"::"text"::"public"."payment_records_method_enum"`);
        await queryRunner.query(`ALTER TABLE "payment_records" ALTER COLUMN "method" SET DEFAULT 'stripe'`);
        await queryRunner.query(`DROP TYPE "public"."payment_records_method_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."payment_records_method_enum_old" AS ENUM('stripe', 'bank_transfer', 'manual')`);
        await queryRunner.query(`ALTER TABLE "payment_records" ALTER COLUMN "method" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payment_records" ALTER COLUMN "method" TYPE "public"."payment_records_method_enum_old" USING "method"::"text"::"public"."payment_records_method_enum_old"`);
        await queryRunner.query(`ALTER TABLE "payment_records" ALTER COLUMN "method" SET DEFAULT 'stripe'`);
        await queryRunner.query(`DROP TYPE "public"."payment_records_method_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."payment_records_method_enum_old" RENAME TO "payment_records_method_enum"`);
    }

}
