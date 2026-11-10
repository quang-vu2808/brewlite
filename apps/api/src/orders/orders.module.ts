import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProductsModule } from '../products/products.module';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { PaymentEntity } from '../payments/payment.entity';
import { ProductInventoryEntity } from './entities/product-inventory.entity';
import { PromotionEntity } from '../promotions/promotion.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { InventoryService } from './inventory.service';
import { StaffGuard } from './guards/staff.guard';
import { InventoryController } from './inventory.controller';
import { IngredientsModule } from '../ingredients/ingredients.module';

@Module({
  imports: [
    AuthModule,
    ProductsModule,
    IngredientsModule,
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      PaymentEntity,
      ProductInventoryEntity,
      PromotionEntity,
    ]),
  ],
  controllers: [OrdersController, InventoryController],
  providers: [OrdersService, InventoryService, StaffGuard],
})
export class OrdersModule {}
