import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceNumberSequence1784740000000 implements MigrationInterface {
  name = 'AddInvoiceNumberSequence1784740000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS invoice_number_seq`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE IF EXISTS invoice_number_seq`);
  }
}
