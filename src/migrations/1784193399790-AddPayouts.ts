import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPayouts1784193399790 implements MigrationInterface {
    name = 'AddPayouts1784193399790'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."payouts_status_enum" AS ENUM('pending', 'paid')`);
        await queryRunner.query(`CREATE TABLE "payouts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "amount" numeric(10,2) NOT NULL, "status" "public"."payouts_status_enum" NOT NULL DEFAULT 'pending', "notes" text, "paidAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "freelancerId" integer, "projectId" integer, CONSTRAINT "PK_76855dc4f0a6c18c72eea302e87" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "payouts" ADD CONSTRAINT "FK_5764371c2189fc98a15ca8d811d" FOREIGN KEY ("freelancerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payouts" ADD CONSTRAINT "FK_871b3a92c3b401d2a94314c4b0e" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payouts" DROP CONSTRAINT "FK_871b3a92c3b401d2a94314c4b0e"`);
        await queryRunner.query(`ALTER TABLE "payouts" DROP CONSTRAINT "FK_5764371c2189fc98a15ca8d811d"`);
        await queryRunner.query(`DROP TABLE "payouts"`);
        await queryRunner.query(`DROP TYPE "public"."payouts_status_enum"`);
    }

}
