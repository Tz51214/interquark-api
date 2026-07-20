import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOnlineTrackingAndImpersonation1783768859332 implements MigrationInterface {
    name = 'AddOnlineTrackingAndImpersonation1783768859332'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."credit_memos_status_enum" AS ENUM('pending', 'refunded', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "credit_memos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "creditMemoNumber" character varying NOT NULL, "amount" numeric(10,2) NOT NULL, "reason" text NOT NULL, "status" "public"."credit_memos_status_enum" NOT NULL DEFAULT 'pending', "refundedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "customerId" integer, "orderId" integer, "invoiceId" uuid, CONSTRAINT "UQ_d1c8b7806646d9e7874946fa869" UNIQUE ("creditMemoNumber"), CONSTRAINT "PK_2ec6272df94e4415253a1ccc0ca" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "login_as_customer_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "adminId" integer, "customerId" integer, CONSTRAINT "PK_45090ad583bb9daa568ade6b2b7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD "lastActiveAt" TIMESTAMP`);
        await queryRunner.query(`CREATE TYPE "public"."payment_records_txntype_enum" AS ENUM('authorization', 'capture', 'refund', 'void')`);
        await queryRunner.query(`ALTER TABLE "payment_records" ADD "txnType" "public"."payment_records_txntype_enum" NOT NULL DEFAULT 'capture'`);
        await queryRunner.query(`ALTER TABLE "payment_records" ADD "orderId" integer`);
        await queryRunner.query(`ALTER TABLE "payment_records" ADD CONSTRAINT "FK_eecc2b9770679603d7c95de5fac" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "credit_memos" ADD CONSTRAINT "FK_c9086f11bdfd85c55a42235bbc9" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "credit_memos" ADD CONSTRAINT "FK_17f025eb474c78108c2b0cdba6b" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "credit_memos" ADD CONSTRAINT "FK_ea2b270f0267749d191925f2cd3" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "login_as_customer_logs" ADD CONSTRAINT "FK_c59f54ddbf0ceac98a26b77f9a8" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "login_as_customer_logs" ADD CONSTRAINT "FK_3f25d25661c932e2908f28896fb" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "login_as_customer_logs" DROP CONSTRAINT "FK_3f25d25661c932e2908f28896fb"`);
        await queryRunner.query(`ALTER TABLE "login_as_customer_logs" DROP CONSTRAINT "FK_c59f54ddbf0ceac98a26b77f9a8"`);
        await queryRunner.query(`ALTER TABLE "credit_memos" DROP CONSTRAINT "FK_ea2b270f0267749d191925f2cd3"`);
        await queryRunner.query(`ALTER TABLE "credit_memos" DROP CONSTRAINT "FK_17f025eb474c78108c2b0cdba6b"`);
        await queryRunner.query(`ALTER TABLE "credit_memos" DROP CONSTRAINT "FK_c9086f11bdfd85c55a42235bbc9"`);
        await queryRunner.query(`ALTER TABLE "payment_records" DROP CONSTRAINT "FK_eecc2b9770679603d7c95de5fac"`);
        await queryRunner.query(`ALTER TABLE "payment_records" DROP COLUMN "orderId"`);
        await queryRunner.query(`ALTER TABLE "payment_records" DROP COLUMN "txnType"`);
        await queryRunner.query(`DROP TYPE "public"."payment_records_txntype_enum"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastActiveAt"`);
        await queryRunner.query(`DROP TABLE "login_as_customer_logs"`);
        await queryRunner.query(`DROP TABLE "credit_memos"`);
        await queryRunner.query(`DROP TYPE "public"."credit_memos_status_enum"`);
    }

}
