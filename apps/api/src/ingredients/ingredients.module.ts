import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProductsModule } from '../products/products.module';
import { StaffGuard } from '../orders/guards/staff.guard';
import { IngredientEntity } from './entities/ingredient.entity';
import { IngredientRecipeEntity } from './entities/ingredient-recipe.entity';
import { OrderIngredientConsumptionEntity } from './entities/order-ingredient-consumption.entity';
import { IngredientAdjustmentEntity } from './entities/ingredient-adjustment.entity';
import { IngredientsController } from './ingredients.controller';
import { IngredientsService } from './ingredients.service';

@Module({
  imports: [
    AuthModule,
    ProductsModule,
    TypeOrmModule.forFeature([
      IngredientEntity,
      IngredientRecipeEntity,
      OrderIngredientConsumptionEntity,
      IngredientAdjustmentEntity,
    ]),
  ],
  controllers: [IngredientsController],
  providers: [IngredientsService, StaffGuard],
  exports: [IngredientsService],
})
export class IngredientsModule {}
