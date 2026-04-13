import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetUserRoleDefaultCustomer1710700000000
  implements MigrationInterface
{
  name = 'SetUserRoleDefaultCustomer1710700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'customer'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'admin'`,
    );
  }
}
