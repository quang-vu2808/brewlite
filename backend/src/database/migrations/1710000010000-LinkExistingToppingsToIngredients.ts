import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkExistingToppingsToIngredients1710000010000 implements MigrationInterface {
  name = 'LinkExistingToppingsToIngredients1710000010000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM (VALUES
            ('CREAM_CHEESE', 'Kem cheese', 'g'),
            ('ESPRESSO', 'Espresso', 'ml'),
            ('PEARLS', 'Trân châu', 'g')
          ) AS expected(code, ingredient_name, unit)
          JOIN "ingredients" ingredient
            ON ingredient.code = expected.code
            OR lower(trim(ingredient.name)) = lower(expected.ingredient_name)
          WHERE ingredient.unit <> expected.unit OR ingredient.kind <> 'INGREDIENT'
        ) THEN
          RAISE EXCEPTION 'Existing topping ingredient has an incompatible unit or kind';
        END IF;
      END;
      $$
    `);
    await queryRunner.query(`
      INSERT INTO "ingredients" ("name", "code", "unit", "stock", "warning_threshold", "kind", "category", "is_active", "compatible_sizes")
      SELECT expected.ingredient_name, expected.code, expected.unit, 0, 0,
        'INGREDIENT', NULL, true, ARRAY[]::varchar(1)[]
      FROM (VALUES
        ('CREAM_CHEESE', 'Kem cheese', 'g'),
        ('ESPRESSO', 'Espresso', 'ml'),
        ('PEARLS', 'Trân châu', 'g')
      ) AS expected(code, ingredient_name, unit)
      WHERE NOT EXISTS (
        SELECT 1 FROM "ingredients" ingredient
        WHERE ingredient.code = expected.code
          OR lower(trim(ingredient.name)) = lower(expected.ingredient_name)
      )
      ON CONFLICT ("code") DO NOTHING
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT expected.code
          FROM (VALUES
            ('CREAM_CHEESE', 'Kem cheese', 'g'),
            ('ESPRESSO', 'Espresso', 'ml'),
            ('PEARLS', 'Trân châu', 'g')
          ) AS expected(code, ingredient_name, unit)
          LEFT JOIN "ingredients" ingredient
            ON ingredient.code = expected.code
            OR (lower(trim(ingredient.name)) = lower(expected.ingredient_name)
              AND ingredient.unit = expected.unit AND ingredient.kind = 'INGREDIENT')
          GROUP BY expected.code
          HAVING count(DISTINCT ingredient.id) <> 1
        ) THEN
          RAISE EXCEPTION 'Could not identify one shared ingredient for each topping';
        END IF;
      END;
      $$
    `);
    await queryRunner.query(`
      UPDATE "toppings" topping
      SET "ingredient_id" = ingredient.id
      FROM (VALUES
        ('cheese-foam', 'CREAM_CHEESE', 'Kem cheese', 'g'),
        ('espresso', 'ESPRESSO', 'Espresso', 'ml'),
        ('pearls', 'PEARLS', 'Trân châu', 'g')
      ) AS mapping(topping_id, ingredient_code, ingredient_name, unit)
      JOIN "ingredients" ingredient
        ON ingredient.code = mapping.ingredient_code
        OR (lower(trim(ingredient.name)) = lower(mapping.ingredient_name)
          AND ingredient.unit = mapping.unit AND ingredient.kind = 'INGREDIENT')
      WHERE topping.id = mapping.topping_id
        AND topping.ingredient_id IS NULL
    `);
  }

  async down(): Promise<void> {
    throw new Error(
      'Refusing to unlink toppings or remove ingredients because stock and inventory history may have changed.',
    );
  }
}
