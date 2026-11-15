import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Task10BusinessRules1710000003000 implements MigrationInterface {
  name = 'Task10BusinessRules1710000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "role" character varying(20) NOT NULL DEFAULT 'CUSTOMER',
      ADD CONSTRAINT "CHK_users_role" CHECK ("role" IN ('CUSTOMER', 'STAFF'))
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN "discount_amount" integer NOT NULL DEFAULT 0,
      ADD COLUMN "promotion_code" character varying(40) NULL,
      ADD COLUMN "loyalty_points_awarded" integer NOT NULL DEFAULT 0,
      ADD COLUMN "inventory_released_at" TIMESTAMPTZ NULL,
      ADD CONSTRAINT "CHK_orders_discount_amount" CHECK ("discount_amount" >= 0),
      ADD CONSTRAINT "CHK_orders_loyalty_points_awarded" CHECK ("loyalty_points_awarded" >= 0),
      ADD CONSTRAINT "CHK_orders_status" CHECK (
        "status" IN ('PENDING', 'PAYMENT_FAILED', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD COLUMN "user_id" uuid NULL,
      ADD COLUMN "idempotency_key" character varying(128) NULL,
      ADD COLUMN "request_hash" character varying(64) NULL,
      ADD COLUMN "result_snapshot" jsonb NULL
    `);
    await queryRunner.query(`
      UPDATE "payments" AS p SET "user_id" = o."user_id"
      FROM "orders" AS o WHERE p."order_id" = o."id"
    `);
    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD CONSTRAINT "FK_payments_user" FOREIGN KEY ("user_id")
      REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_payments_user_idempotency_key"
      ON "payments" ("user_id", "idempotency_key")
      WHERE "idempotency_key" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE TABLE "product_inventory" (
        "product_id" integer NOT NULL,
        "stock" integer NOT NULL DEFAULT 0,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_product_inventory" PRIMARY KEY ("product_id"),
        CONSTRAINT "CHK_product_inventory_stock" CHECK ("stock" >= 0),
        CONSTRAINT "CHK_product_inventory_version" CHECK ("version" > 0)
      )
    `);
    await queryRunner.query(`
      INSERT INTO "product_inventory" ("product_id", "stock", "version")
      VALUES (1, 100, 1), (2, 100, 1), (3, 100, 1)
      ON CONFLICT ("product_id") DO NOTHING
    `);
    await queryRunner.query(`
      CREATE TABLE "promotions" (
        "code" character varying(40) NOT NULL,
        "discount_type" character varying(10) NOT NULL,
        "value" integer NOT NULL,
        "minimum_amount" integer NOT NULL DEFAULT 0,
        "maximum_discount" integer NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_promotions_code" PRIMARY KEY ("code"),
        CONSTRAINT "CHK_promotions_type" CHECK ("discount_type" IN ('PERCENT', 'FIXED')),
        CONSTRAINT "CHK_promotions_value" CHECK ("value" > 0),
        CONSTRAINT "CHK_promotions_minimum_amount" CHECK ("minimum_amount" >= 0),
        CONSTRAINT "CHK_promotions_maximum_discount" CHECK ("maximum_discount" IS NULL OR "maximum_discount" > 0)
      )
    `);
    await queryRunner.query(`
      INSERT INTO "promotions"
        ("code", "discount_type", "value", "minimum_amount", "maximum_discount", "is_active")
      VALUES
        ('BREW10', 'PERCENT', 10, 20000, 15000, true),
        ('WELCOME5000', 'FIXED', 5000, 30000, NULL, true)
      ON CONFLICT ("code") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "promotions"');
    await queryRunner.query('DROP TABLE "product_inventory"');
    await queryRunner.query('DROP INDEX "UQ_payments_user_idempotency_key"');
    await queryRunner.query(`
      ALTER TABLE "payments"
      DROP CONSTRAINT "FK_payments_user",
      DROP COLUMN "request_hash",
      DROP COLUMN "idempotency_key",
      DROP COLUMN "result_snapshot",
      DROP COLUMN "user_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP CONSTRAINT "CHK_orders_status",
      DROP CONSTRAINT "CHK_orders_loyalty_points_awarded",
      DROP CONSTRAINT "CHK_orders_discount_amount",
      DROP COLUMN "inventory_released_at",
      DROP COLUMN "loyalty_points_awarded",
      DROP COLUMN "promotion_code",
      DROP COLUMN "discount_amount"
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT "CHK_users_role",
      DROP COLUMN "role"
    `);
  }
}
