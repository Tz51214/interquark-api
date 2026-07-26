import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDiscountCodeToOrders1785053556026 implements MigrationInterface {
    name = 'AddDiscountCodeToOrders1785053556026'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "discountCode" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "discountCode"`);
    }

}
