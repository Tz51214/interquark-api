import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIpAddressToOrders1785167806801 implements MigrationInterface {
    name = 'AddIpAddressToOrders1785167806801'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "ipAddress" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "ipAddress"`);
    }

}
