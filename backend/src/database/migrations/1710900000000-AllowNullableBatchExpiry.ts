import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowNullableBatchExpiry1710900000000
  implements MigrationInterface
{
  name = 'AllowNullableBatchExpiry1710900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "batches"
      ALTER COLUMN "expiryDate" DROP NOT NULL
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_batches_product_batch_expiry"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_batches_product_batch_expiry"
      ON "batches" (
        "productId",
        "batchNumber",
        COALESCE("expiryDate", DATE '9999-12-31')
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "batches"
      SET "expiryDate" = DATE '9999-12-31'
      WHERE "expiryDate" IS NULL
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_batches_product_batch_expiry"`);
    await queryRunner.query(`
      ALTER TABLE "batches"
      ALTER COLUMN "expiryDate" SET NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_batches_product_batch_expiry"
      ON "batches" ("productId", "batchNumber", "expiryDate")
    `);
  }
}
