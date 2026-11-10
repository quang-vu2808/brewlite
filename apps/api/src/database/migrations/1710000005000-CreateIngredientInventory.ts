import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIngredientInventory1710000005000 implements MigrationInterface {
  name = 'CreateIngredientInventory1710000005000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ingredients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(160) NOT NULL,
        "code" character varying(40) NOT NULL,
        "unit" character varying(24) NOT NULL,
        "stock" integer NOT NULL DEFAULT 0,
        "warning_threshold" integer NOT NULL DEFAULT 0,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ingredients" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ingredients_code" UNIQUE ("code"),
        CONSTRAINT "CHK_ingredients_stock" CHECK ("stock" >= 0),
        CONSTRAINT "CHK_ingredients_warning_threshold" CHECK ("warning_threshold" >= 0),
        CONSTRAINT "CHK_ingredients_version" CHECK ("version" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "product_recipes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id" integer NOT NULL,
        "ingredient_id" uuid NOT NULL,
        "quantity_required" integer NOT NULL,
        CONSTRAINT "PK_product_recipes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_product_recipes_product_ingredient" UNIQUE ("product_id", "ingredient_id"),
        CONSTRAINT "FK_product_recipes_ingredient" FOREIGN KEY ("ingredient_id")
          REFERENCES "ingredients"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_product_recipes_quantity" CHECK ("quantity_required" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_product_recipes_product_id" ON "product_recipes" ("product_id")
    `);
    await queryRunner.query(`
      CREATE TABLE "order_ingredient_consumptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "ingredient_id" uuid NOT NULL,
        "ingredient_name" character varying(160) NOT NULL,
        "ingredient_code" character varying(40) NOT NULL,
        "ingredient_unit" character varying(24) NOT NULL,
        "quantity" integer NOT NULL,
        CONSTRAINT "PK_order_ingredient_consumptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_ingredient_consumptions_order" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_ingredient_consumptions_ingredient" FOREIGN KEY ("ingredient_id")
          REFERENCES "ingredients"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_order_ingredient_consumptions_quantity" CHECK ("quantity" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_order_ingredient_consumptions_order_id"
      ON "order_ingredient_consumptions" ("order_id")
    `);
    await queryRunner.query(`
      CREATE TABLE "ingredient_adjustments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ingredient_id" uuid NOT NULL,
        "staff_user_id" uuid NOT NULL,
        "delta" integer NOT NULL,
        "reason" character varying(200) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ingredient_adjustments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ingredient_adjustments_ingredient" FOREIGN KEY ("ingredient_id")
          REFERENCES "ingredients"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_ingredient_adjustments_staff_user" FOREIGN KEY ("staff_user_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_ingredient_adjustments_delta" CHECK ("delta" <> 0),
        CONSTRAINT "CHK_ingredient_adjustments_reason" CHECK (length(trim("reason")) > 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ingredient_adjustments_ingredient_created"
      ON "ingredient_adjustments" ("ingredient_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      INSERT INTO "ingredients" ("name", "code", "unit", "stock", "warning_threshold")
      VALUES
        ('Hạt cà phê', 'COFFEE_BEANS', 'g', 10000, 500),
        ('Sữa tươi', 'FRESH_MILK', 'ml', 100000, 5000),
        ('Trà đào', 'PEACH_TEA', 'g', 10000, 500),
        ('Sả', 'LEMONGRASS', 'g', 10000, 500)
      ON CONFLICT ("code") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "product_recipes" ("product_id", "ingredient_id", "quantity_required")
      SELECT recipe.product_id, ingredient.id, recipe.quantity_required
      FROM (VALUES
        (1, 'COFFEE_BEANS', 18),
        (1, 'FRESH_MILK', 120),
        (2, 'COFFEE_BEANS', 18),
        (2, 'FRESH_MILK', 80),
        (3, 'PEACH_TEA', 20),
        (3, 'LEMONGRASS', 10)
      ) AS recipe(product_id, ingredient_code, quantity_required)
      JOIN "ingredients" ingredient ON ingredient.code = recipe.ingredient_code
      ON CONFLICT ("product_id", "ingredient_id") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "ingredient_adjustments"');
    await queryRunner.query('DROP TABLE "order_ingredient_consumptions"');
    await queryRunner.query('DROP TABLE "product_recipes"');
    await queryRunner.query('DROP TABLE "ingredients"');
  }
}
