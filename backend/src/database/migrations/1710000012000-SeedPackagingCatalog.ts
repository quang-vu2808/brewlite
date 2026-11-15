import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPackagingCatalog1710000012000 implements MigrationInterface {
  name = 'SeedPackagingCatalog1710000012000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        expected record;
        matches uuid[];
        item_id uuid;
      BEGIN
        FOR expected IN
          SELECT * FROM (VALUES
            ('CUP_S', 'Ly size S', 'CUP', ARRAY['S']::varchar(1)[]),
            ('CUP_M', 'Ly size M', 'CUP', ARRAY['M']::varchar(1)[]),
            ('CUP_L', 'Ly size L', 'CUP', ARRAY['L']::varchar(1)[]),
            ('LID', 'Nắp ly (chung)', 'LID', ARRAY['S', 'M', 'L']::varchar(1)[]),
            ('STRAW', 'Ống hút (chung)', 'STRAW', ARRAY['S', 'M', 'L']::varchar(1)[]),
            ('DRINK_BAG', 'Bịch đựng đồ uống (chung)', 'BAG', ARRAY['S', 'M', 'L']::varchar(1)[])
          ) AS catalog(code, name, category, compatible_sizes)
        LOOP
          SELECT array_agg(DISTINCT ingredient.id)
          INTO matches
          FROM "ingredients" ingredient
          WHERE ingredient.code = expected.code
             OR (
               lower(trim(ingredient.name)) = lower(expected.name)
               AND ingredient.unit = 'cái'
             );

          IF coalesce(cardinality(matches), 0) > 1 THEN
            RAISE EXCEPTION 'Multiple packaging records match catalog item %', expected.code;
          END IF;

          IF coalesce(cardinality(matches), 0) = 1 THEN
            item_id := matches[1];
            IF NOT EXISTS (
              SELECT 1
              FROM "ingredients"
              WHERE id = item_id
                AND kind = 'PACKAGING'
                AND unit = 'cái'
            ) THEN
              RAISE EXCEPTION 'Existing record for packaging item % has an incompatible kind or unit', expected.code;
            END IF;

            UPDATE "ingredients"
            SET category = expected.category,
                compatible_sizes = expected.compatible_sizes
            WHERE id = item_id;
          ELSE
            INSERT INTO "ingredients" (
              "name", "code", "unit", "stock", "warning_threshold", "kind",
              "category", "is_active", "compatible_sizes", "version"
            )
            VALUES (
              expected.name, expected.code, 'cái', 0, 0, 'PACKAGING',
              expected.category, true, expected.compatible_sizes, 1
            )
            ON CONFLICT ("code") DO NOTHING;

            IF NOT EXISTS (
              SELECT 1
              FROM "ingredients"
              WHERE code = expected.code
                AND kind = 'PACKAGING'
                AND unit = 'cái'
            ) THEN
              RAISE EXCEPTION 'Could not create packaging catalog item %', expected.code;
            END IF;
          END IF;
        END LOOP;
      END;
      $$;
    `);
  }

  async down(): Promise<void> {
    throw new Error(
      'Refusing to delete packaging catalog records because inventory or audit history may have changed.',
    );
  }
}
