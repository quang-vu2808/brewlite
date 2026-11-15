import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayments1710000002000 implements MigrationInterface {
  name = 'CreatePayments1710000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL,
        "method" character varying(10) NOT NULL,
        "status" character varying(10) NOT NULL,
        "amount" integer NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_payments_method" CHECK ("method" IN ('WALLET', 'CARD')),
        CONSTRAINT "CHK_payments_status" CHECK ("status" IN ('SUCCESS', 'FAILED')),
        CONSTRAINT "CHK_payments_amount" CHECK ("amount" >= 0),
        CONSTRAINT "FK_payments_order" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_payments_order_id" ON "payments" ("order_id")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_payments_order_id"');
    await queryRunner.query('DROP TABLE "payments"');
  }
}
