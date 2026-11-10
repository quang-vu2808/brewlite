import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UseSharedToppingPortionInConstraint1710000011000 implements MigrationInterface {
  name = 'UseSharedToppingPortionInConstraint1710000011000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "toppings"
      SET "is_active" = false
      WHERE "is_active"
        AND ("ingredient_id" IS NULL OR "portion_quantity_required" IS NULL)
    `);
    await queryRunner.query(`
      ALTER TABLE "toppings"
      DROP CONSTRAINT IF EXISTS "CHK_toppings_active_configuration"
    `);
    await queryRunner.query(`
      ALTER TABLE "toppings"
      ADD CONSTRAINT "CHK_toppings_active_configuration"
      CHECK (
        NOT "is_active" OR
        ("ingredient_id" IS NOT NULL AND "portion_quantity_required" IS NOT NULL)
      )
    `);
  }

  async down(): Promise<void> {
    throw new Error(
      'Refusing to restore the legacy topping constraint because it is incompatible with shared portion configuration.',
    );
  }
}
