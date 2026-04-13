import { Module } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeCoreModule } from './core/realtime-core.module';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [RealtimeCoreModule, NotificationsModule, MessagingModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
