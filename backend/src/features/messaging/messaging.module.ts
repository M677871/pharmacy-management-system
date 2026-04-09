import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeCoreModule } from '../realtime/core/realtime-core.module';
import { User } from '../users/entities/user.entity';
import { BroadcastsService } from './broadcasts.service';
import { ChatService } from './chat.service';
import { MessagingController } from './messaging.controller';
import { BroadcastMessage } from './entities/broadcast-message.entity';
import { ChatMessage } from './entities/chat-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage, BroadcastMessage, User]),
    NotificationsModule,
    RealtimeCoreModule,
  ],
  providers: [ChatService, BroadcastsService],
  controllers: [MessagingController],
  exports: [ChatService, BroadcastsService],
})
export class MessagingModule {}
