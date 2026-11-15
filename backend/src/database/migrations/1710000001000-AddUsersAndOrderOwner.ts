import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsersAndOrderOwner1710000001000 implements MigrationInterface {
  name = 'AddUsersAndOrderOwner1710000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(254) NOT NULL,
        "password_hash" character varying(60) NOT NULL,
        "loyalty_points" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "CHK_users_loyalty_points" CHECK ("loyalty_points" >= 0)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN "user_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "FK_orders_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_orders_user_id" ON "orders" ("user_id")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_orders_user_id"');
    await queryRunner.query(
      'ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_user"',
    );
    await queryRunner.query('ALTER TABLE "orders" DROP COLUMN "user_id"');
    await queryRunner.query('DROP TABLE "users"');
  }
}
