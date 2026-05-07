import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductExpirySetting1711000000000
  implements MigrationInterface
{
  name = 'AddProductExpirySetting1711000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "doesNotExpire" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP COLUMN IF EXISTS "doesNotExpire"
    `);
  }
}
