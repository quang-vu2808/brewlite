import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RecipesPackagingAndToppings1710000007000 implements MigrationInterface {
  name = 'RecipesPackagingAndToppings1710000007000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ingredients"
      ADD COLUMN "kind" varchar(16) NOT NULL DEFAULT 'INGREDIENT',
      ADD COLUMN "category" varchar(40) NULL,
      ADD COLUMN "is_active" boolean NOT NULL DEFAULT true,
      ADD COLUMN "compatible_sizes" varchar(1)[] NOT NULL DEFAULT ARRAY[]::varchar(1)[],
      ADD CONSTRAINT "CHK_ingredients_kind" CHECK ("kind" IN ('INGREDIENT', 'PACKAGING')),
      ADD CONSTRAINT "CHK_ingredients_compatible_sizes" CHECK (
        "compatible_sizes" <@ ARRAY['S', 'M', 'L']::varchar(1)[]
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "product_size_recipes" (
        "product_id" integer NOT NULL,
        "size" varchar(1) NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_size_recipes" PRIMARY KEY ("product_id", "size"),
        CONSTRAINT "CHK_product_size_recipes_size" CHECK ("size" IN ('S', 'M', 'L'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "product_size_recipe_items" (
        "product_id" integer NOT NULL,
        "size" varchar(1) NOT NULL,
        "ingredient_id" uuid NOT NULL,
        "quantity_required" integer NOT NULL,
        CONSTRAINT "PK_product_size_recipe_items" PRIMARY KEY ("product_id", "size", "ingredient_id"),
        CONSTRAINT "FK_product_size_recipe_items_recipe" FOREIGN KEY ("product_id", "size")
          REFERENCES "product_size_recipes"("product_id", "size") ON DELETE CASCADE,
        CONSTRAINT "FK_product_size_recipe_items_ingredient" FOREIGN KEY ("ingredient_id")
          REFERENCES "ingredients"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_product_size_recipe_items_quantity" CHECK ("quantity_required" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "product_packaging_recipes" (
        "product_id" integer NOT NULL,
        "size" varchar(1) NOT NULL,
        "ingredient_id" uuid NOT NULL,
        "usage_type" varchar(16) NOT NULL,
        "quantity_required" integer NOT NULL,
        "servings_per_unit" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_product_packaging_recipes" PRIMARY KEY ("product_id", "size", "ingredient_id"),
        CONSTRAINT "FK_product_packaging_recipes_ingredient" FOREIGN KEY ("ingredient_id")
          REFERENCES "ingredients"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_product_packaging_recipes_size" CHECK ("size" IN ('S', 'M', 'L')),
        CONSTRAINT "CHK_product_packaging_recipes_usage" CHECK ("usage_type" IN ('PER_SERVING', 'PER_ORDER', 'PER_GROUP')),
        CONSTRAINT "CHK_product_packaging_recipes_quantity" CHECK ("quantity_required" > 0),
        CONSTRAINT "CHK_product_packaging_recipes_servings" CHECK ("servings_per_unit" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "toppings" (
        "id" varchar(40) NOT NULL,
        "name" varchar(100) NOT NULL,
        "surcharge" integer NOT NULL,
        "ingredient_id" uuid NULL,
        "is_active" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_toppings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_toppings_ingredient" FOREIGN KEY ("ingredient_id")
          REFERENCES "ingredients"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_toppings_surcharge" CHECK ("surcharge" >= 0),
        CONSTRAINT "CHK_toppings_active_configuration" CHECK (
          NOT "is_active" OR "ingredient_id" IS NOT NULL
        )
      )
    `);
    await queryRunner.query(`
      INSERT INTO "toppings" ("id", "name", "surcharge")
      VALUES
        ('pearls', 'Trân châu', 5000),
        ('cheese-foam', 'Kem cheese', 10000),
        ('espresso', 'Shot espresso', 8000)
      ON CONFLICT ("id") DO NOTHING
    `);
    await queryRunner.query(`
      CREATE TABLE "product_topping_recipes" (
        "product_id" integer NOT NULL,
        "size" varchar(1) NOT NULL,
        "topping_id" varchar(40) NOT NULL,
        "quantity_required" integer NOT NULL,
        "max_portions" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_product_topping_recipes" PRIMARY KEY ("product_id", "size", "topping_id"),
        CONSTRAINT "FK_product_topping_recipes_topping" FOREIGN KEY ("topping_id")
          REFERENCES "toppings"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_product_topping_recipes_size" CHECK ("size" IN ('S', 'M', 'L')),
        CONSTRAINT "CHK_product_topping_recipes_quantity" CHECK ("quantity_required" > 0),
        CONSTRAINT "CHK_product_topping_recipes_max_portions" CHECK ("max_portions" > 0)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "product_topping_recipes"');
    await queryRunner.query('DROP TABLE "toppings"');
    await queryRunner.query('DROP TABLE "product_packaging_recipes"');
    await queryRunner.query('DROP TABLE "product_size_recipe_items"');
    await queryRunner.query('DROP TABLE "product_size_recipes"');
    await queryRunner.query(`
      ALTER TABLE "ingredients"
      DROP CONSTRAINT "CHK_ingredients_compatible_sizes",
      DROP CONSTRAINT "CHK_ingredients_kind",
      DROP COLUMN "compatible_sizes",
      DROP COLUMN "is_active",
      DROP COLUMN "category",
      DROP COLUMN "kind"
    `);
  }
}
