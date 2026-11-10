import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SharedToppingPortionQuantity1710000009000 implements MigrationInterface {
  name = 'SharedToppingPortionQuantity1710000009000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "toppings"
      ADD COLUMN IF NOT EXISTS "portion_quantity_required" integer NULL
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'CHK_toppings_portion_quantity'
        ) THEN
          ALTER TABLE "toppings"
          ADD CONSTRAINT "CHK_toppings_portion_quantity"
          CHECK ("portion_quantity_required" IS NULL OR "portion_quantity_required" > 0);
        END IF;
      END;
      $$
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "toppings"
      DROP CONSTRAINT IF EXISTS "CHK_toppings_portion_quantity",
      DROP COLUMN IF EXISTS "portion_quantity_required"
    `);
  }
}
