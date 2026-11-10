import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UseCondensedMilkForCoffee1710000006000 implements MigrationInterface {
  name = 'UseCondensedMilkForCoffee1710000006000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "ingredients" ("name", "code", "unit", "stock", "warning_threshold")
      VALUES ('Sữa đặc', 'CONDENSED_MILK', 'ml', 0, 0)
      ON CONFLICT ("code") DO NOTHING
    `);
    await queryRunner.query(`
      UPDATE "product_recipes" recipe
      SET "ingredient_id" = condensed."id"
      FROM "ingredients" fresh, "ingredients" condensed
      WHERE recipe."product_id" = 1
        AND recipe."ingredient_id" = fresh."id"
        AND fresh."code" = 'FRESH_MILK'
        AND condensed."code" = 'CONDENSED_MILK'
        AND NOT EXISTS (
          SELECT 1 FROM "product_recipes" existing
          WHERE existing."product_id" = recipe."product_id"
            AND existing."ingredient_id" = condensed."id"
        )
    `);
    await queryRunner.query(`
      DELETE FROM "product_recipes" recipe
      USING "ingredients" fresh
      WHERE recipe."product_id" = 1
        AND recipe."ingredient_id" = fresh."id"
        AND fresh."code" = 'FRESH_MILK'
        AND EXISTS (
          SELECT 1 FROM "product_recipes" existing
          JOIN "ingredients" condensed ON condensed."id" = existing."ingredient_id"
          WHERE existing."product_id" = recipe."product_id"
            AND condensed."code" = 'CONDENSED_MILK'
        )
    `);
  }

  async down(): Promise<void> {
    // Retain stock, recipes and order history that may have changed since migration.
  }
}
