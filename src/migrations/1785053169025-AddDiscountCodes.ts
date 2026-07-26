import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDiscountCodes1785053169025 implements MigrationInterface {
    name = 'AddDiscountCodes1785053169025'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."discount_codes_type_enum" AS ENUM('percentage', 'fixed')`);
        await queryRunner.query(`CREATE TABLE "discount_codes" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "type" "public"."discount_codes_type_enum" NOT NULL, "value" numeric(10,2) NOT NULL, "active" boolean NOT NULL DEFAULT true, "maxUses" integer, "usedCount" integer NOT NULL DEFAULT '0', "expiresAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b967edd0d46547d4a92b4a1c6b3" UNIQUE ("code"), CONSTRAINT "PK_c0170a28d937472e9ce50fdce17" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "discount_codes"`);
        await queryRunner.query(`DROP TYPE "public"."discount_codes_type_enum"`);
    }

}
