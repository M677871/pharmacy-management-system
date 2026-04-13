import { Module } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { RealtimeCoreModule } from './core/realtime-core.module';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [
    RealtimeCoreModule,
    NotificationsModule,
    MessagingModule,
    OrdersModule,
  ],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
