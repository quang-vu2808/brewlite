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
          entities: [OrderEntity, OrderItemEntity, UserEntity, PaymentEntity],
          migrations: [
            CreateOrders1710000000000,
            AddUsersAndOrderOwner1710000001000,
            CreatePayments1710000002000,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
