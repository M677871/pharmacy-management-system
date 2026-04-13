import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { PresenceService } from './presence.service';
import { RealtimeEmitterService } from './realtime-emitter.service';
import { SocketAuthService } from './socket-auth.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [RealtimeEmitterService, SocketAuthService, PresenceService],
  exports: [RealtimeEmitterService, SocketAuthService, PresenceService],
})
export class RealtimeCoreModule {}
