import { Module } from '@nestjs/common';
import { CallsModule } from '../calls/calls.module';
import { MeetingsModule } from '../meetings/meetings.module';
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
    CallsModule,
    MeetingsModule,
  ],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
