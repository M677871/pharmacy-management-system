import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetMetadata1710600000000
  implements MigrationInterface
{
  name = 'AddPasswordResetMetadata1710600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD "passwordResetMethod" character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD "passwordResetAttempts" integer NOT NULL DEFAULT 0',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" DROP COLUMN "passwordResetAttempts"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" DROP COLUMN "passwordResetMethod"',
    );
  }
}
