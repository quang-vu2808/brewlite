import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RedemptionAndPromotionRules1710000004000 implements MigrationInterface {
  name = 'RedemptionAndPromotionRules1710000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN "subtotal_amount" integer NOT NULL DEFAULT 0,
      ADD COLUMN "loyalty_discount_amount" integer NOT NULL DEFAULT 0,
      ADD COLUMN "redeemed_points" integer NOT NULL DEFAULT 0,
      ADD COLUMN "promotion_usage_released_at" TIMESTAMPTZ NULL
    `);
    await queryRunner.query(`
      UPDATE "orders"
      SET "subtotal_amount" = "total_amount" + "discount_amount"
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "CHK_orders_subtotal_amount" CHECK ("subtotal_amount" >= 0),
      ADD CONSTRAINT "CHK_orders_loyalty_discount_amount" CHECK ("loyalty_discount_amount" >= 0),
      ADD CONSTRAINT "CHK_orders_redeemed_points" CHECK ("redeemed_points" >= 0),
      ADD CONSTRAINT "CHK_orders_redeem_points_amount" CHECK (
        "redeemed_points"::bigint * 100 = "loyalty_discount_amount"
      ),
      ADD CONSTRAINT "CHK_orders_discount_breakdown" CHECK (
        "total_amount" = "subtotal_amount" - "discount_amount" - "loyalty_discount_amount"
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "promotions"
      ADD COLUMN "starts_at" TIMESTAMPTZ NULL,
      ADD COLUMN "ends_at" TIMESTAMPTZ NULL,
      ADD COLUMN "usage_limit" integer NULL,
      ADD COLUMN "usage_count" integer NOT NULL DEFAULT 0,
      ADD CONSTRAINT "CHK_promotions_usage_limit" CHECK ("usage_limit" IS NULL OR "usage_limit" >= 0),
      ADD CONSTRAINT "CHK_promotions_usage_count" CHECK ("usage_count" >= 0),
      ADD CONSTRAINT "CHK_promotions_date_range" CHECK ("ends_at" IS NULL OR "starts_at" IS NULL OR "ends_at" > "starts_at")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "promotions"
      DROP CONSTRAINT "CHK_promotions_date_range",
      DROP CONSTRAINT "CHK_promotions_usage_count",
      DROP CONSTRAINT "CHK_promotions_usage_limit",
      DROP COLUMN "usage_count",
      DROP COLUMN "usage_limit",
      DROP COLUMN "ends_at",
      DROP COLUMN "starts_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP CONSTRAINT "CHK_orders_redeemed_points",
      DROP CONSTRAINT "CHK_orders_redeem_points_amount",
      DROP CONSTRAINT "CHK_orders_loyalty_discount_amount",
      DROP CONSTRAINT "CHK_orders_subtotal_amount",
      DROP CONSTRAINT "CHK_orders_discount_breakdown",
      DROP COLUMN "promotion_usage_released_at",
      DROP COLUMN "redeemed_points",
      DROP COLUMN "loyalty_discount_amount",
      DROP COLUMN "subtotal_amount"
    `);
  }
}
