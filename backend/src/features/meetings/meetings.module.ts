import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from '../media/media.module';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeCoreModule } from '../realtime/core/realtime-core.module';
import { User } from '../users/entities/user.entity';
import { Meeting } from './entities/meeting.entity';
import { MeetingNote } from './entities/meeting-note.entity';
import { MeetingParticipant } from './entities/meeting-participant.entity';
import { MeetingRecording } from './entities/meeting-recording.entity';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Meeting,
      MeetingParticipant,
      MeetingNote,
      MeetingRecording,
      User,
    ]),
    MediaModule,
    NotificationsModule,
    MessagingModule,
    RealtimeCoreModule,
  ],
  providers: [MeetingsService],
  controllers: [MeetingsController],
  exports: [MeetingsService],
})
export class MeetingsModule {}
