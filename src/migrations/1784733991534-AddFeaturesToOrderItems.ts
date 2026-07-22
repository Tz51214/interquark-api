import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeaturesToOrderItems1784733991534 implements MigrationInterface {
    name = 'AddFeaturesToOrderItems1784733991534'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_items" ADD "features" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "features"`);
    }

}
