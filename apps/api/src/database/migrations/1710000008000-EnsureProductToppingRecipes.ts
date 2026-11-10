import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureProductToppingRecipes1710000008000 implements MigrationInterface {
  name = 'EnsureProductToppingRecipes1710000008000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_topping_recipes" (
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

  async down(): Promise<void> {
    throw new Error(
      'Refusing to drop product_topping_recipes because it may contain configured topping data.',
    );
  }
}
