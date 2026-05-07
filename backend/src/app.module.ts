import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { Request, Response } from 'express';
import { validateEnvironment } from './config/env.validation';
import { DatabaseModule } from './database/database.config';
import { AuthModule } from './features/auth/auth.module';
import { CallsModule } from './features/calls/calls.module';
import { DashboardModule } from './features/dashboard/dashboard.module';
import { InventoryModule } from './features/inventory/inventory.module';
import { MediaModule } from './features/media/media.module';
import { MeetingsModule } from './features/meetings/meetings.module';
import { RealtimeModule } from './features/realtime/realtime.module';
import { UsersModule } from './features/users/users.module';
import { MessagingModule } from './features/messaging/messaging.module';
import { OrdersModule } from './features/orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      path: 'graphql',
      useGlobalPrefix: true,
      context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
    }),
    DatabaseModule,
    AuthModule,
    DashboardModule,
    InventoryModule,
    OrdersModule,
    RealtimeModule,
    MessagingModule,
    MediaModule,
    CallsModule,
    MeetingsModule,
    UsersModule,
  ],
})
export class AppModule {}
