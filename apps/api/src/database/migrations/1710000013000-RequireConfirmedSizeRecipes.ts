import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RequireConfirmedSizeRecipes1710000013000 implements MigrationInterface {
  name = 'RequireConfirmedSizeRecipes1710000013000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product_size_recipes"
      ADD COLUMN "approval_status" varchar(16) NOT NULL DEFAULT 'PENDING',
      ADD CONSTRAINT "CHK_product_size_recipes_approval_status"
        CHECK ("approval_status" IN ('PENDING', 'CONFIRMED'))
    `);
  }

  async down(): Promise<void> {
    throw new Error(
      'This migration is forward-only: removing the approval gate could reactivate unconfirmed recipes.',
    );
  }
}
