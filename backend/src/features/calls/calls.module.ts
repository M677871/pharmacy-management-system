import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeCoreModule } from '../realtime/core/realtime-core.module';
import { User } from '../users/entities/user.entity';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { CallParticipant } from './entities/call-participant.entity';
import { CallRecording } from './entities/call-recording.entity';
import { CallSession } from './entities/call-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CallSession,
      CallParticipant,
      CallRecording,
      User,
    ]),
    MediaModule,
    NotificationsModule,
    RealtimeCoreModule,
  ],
  providers: [CallsService],
  controllers: [CallsController],
  exports: [CallsService],
})
export class CallsModule {}
