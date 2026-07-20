import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaypalOrderIdToOrders1783855140157 implements MigrationInterface {
    name = 'AddPaypalOrderIdToOrders1783855140157'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "paypalOrderId" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "paypalOrderId"`);
    }

}
