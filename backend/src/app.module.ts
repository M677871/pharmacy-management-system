import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.config';
import { AuthModule } from './features/auth/auth.module';
import { DashboardModule } from './features/dashboard/dashboard.module';
import { InventoryModule } from './features/inventory/inventory.module';
import { RealtimeModule } from './features/realtime/realtime.module';
import { UsersModule } from './features/users/users.module';
import { MessagingModule } from './features/messaging/messaging.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    DashboardModule,
    InventoryModule,
    RealtimeModule,
    MessagingModule,
    UsersModule,
  ],
})
export class AppModule {}
