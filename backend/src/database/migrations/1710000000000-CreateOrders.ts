import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrders1710000000000 implements MigrationInterface {
  name = 'CreateOrders1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "status" character varying(20) NOT NULL DEFAULT 'PENDING',
        "total_amount" integer NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_orders_total_amount" CHECK ("total_amount" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL,
        "product_id" integer NOT NULL,
        "product_name" character varying(200) NOT NULL,
        "size" character varying(1) NOT NULL,
        "toppings" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "quantity" integer NOT NULL,
        "unit_price" integer NOT NULL,
        "line_total" integer NOT NULL,
        CONSTRAINT "PK_order_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_order_items_size" CHECK ("size" IN ('S', 'M', 'L')),
        CONSTRAINT "CHK_order_items_quantity" CHECK ("quantity" BETWEEN 1 AND 99),
        CONSTRAINT "CHK_order_items_unit_price" CHECK ("unit_price" >= 0),
        CONSTRAINT "CHK_order_items_line_total" CHECK ("line_total" >= 0),
        CONSTRAINT "FK_order_items_order" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      'CREATE INDEX "IDX_order_items_order_id" ON "order_items" ("order_id")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_order_items_order_id"');
    await queryRunner.query('DROP TABLE "order_items"');
    await queryRunner.query('DROP TABLE "orders"');
  }
}
