import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CreateOrders1710000000000 } from './database/migrations/1710000000000-CreateOrders';
import { AddUsersAndOrderOwner1710000001000 } from './database/migrations/1710000001000-AddUsersAndOrderOwner';
import { AuthModule } from './auth/auth.module';
import { OrderEntity } from './orders/entities/order.entity';
import { OrderItemEntity } from './orders/entities/order-item.entity';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { UserEntity } from './users/user.entity';
import { PaymentEntity } from './payments/payment.entity';
import { PaymentsModule } from './payments/payments.module';
import { CreatePayments1710000002000 } from './database/migrations/1710000002000-CreatePayments';
import { Task10BusinessRules1710000003000 } from './database/migrations/1710000003000-Task10BusinessRules';
import { ProductInventoryEntity } from './orders/entities/product-inventory.entity';
import { PromotionEntity } from './promotions/promotion.entity';
import { RedemptionAndPromotionRules1710000004000 } from './database/migrations/1710000004000-RedemptionAndPromotionRules';
import { PromotionsModule } from './promotions/promotions.module';
import { IngredientEntity } from './ingredients/entities/ingredient.entity';
import { IngredientRecipeEntity } from './ingredients/entities/ingredient-recipe.entity';
import { OrderIngredientConsumptionEntity } from './ingredients/entities/order-ingredient-consumption.entity';
import { IngredientsModule } from './ingredients/ingredients.module';
import { IngredientAdjustmentEntity } from './ingredients/entities/ingredient-adjustment.entity';
import { CreateIngredientInventory1710000005000 } from './database/migrations/1710000005000-CreateIngredientInventory';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(__dirname, '../../../.env'),
        resolve(process.cwd(), '.env'),
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const port = Number(config.get('DB_PORT') ?? 5432);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          throw new Error('DB_PORT phải là số cổng hợp lệ');
        }

        return {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST') ?? 'localhost',
          port,
          username: config.get<string>('DB_USER') ?? 'brewlite',
          password: config.getOrThrow<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME') ?? 'brewlite',
          entities: [
            OrderEntity,
            OrderItemEntity,
            UserEntity,
            PaymentEntity,
            ProductInventoryEntity,
            PromotionEntity,
            IngredientEntity,
            IngredientRecipeEntity,
            OrderIngredientConsumptionEntity,
            IngredientAdjustmentEntity,
          ],
          migrations: [
            CreateOrders1710000000000,
            AddUsersAndOrderOwner1710000001000,
            CreatePayments1710000002000,
            Task10BusinessRules1710000003000,
            RedemptionAndPromotionRules1710000004000,
            CreateIngredientInventory1710000005000,
          ],
          migrationsRun: true,
          synchronize: false,
        };
      },
    }),
    ProductsModule,
    AuthModule,
    OrdersModule,
    PaymentsModule,
    PromotionsModule,
    IngredientsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
