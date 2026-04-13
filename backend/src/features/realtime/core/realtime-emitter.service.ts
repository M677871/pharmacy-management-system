import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { UserRole } from '../../users/entities/user.entity';
import { realtimeRoom } from '../realtime.events';

@Injectable()
export class RealtimeEmitterService {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emitToUser<TPayload>(userId: string, event: string, payload: TPayload) {
    this.server?.to(realtimeRoom.user(userId)).emit(event, payload);
  }

  emitToUsers<TPayload>(userIds: string[], event: string, payload: TPayload) {
    const uniqueUserIds = [...new Set(userIds)];

    for (const userId of uniqueUserIds) {
      this.emitToUser(userId, event, payload);
    }
  }

  emitToRole<TPayload>(role: UserRole, event: string, payload: TPayload) {
    this.server?.to(realtimeRoom.role(role)).emit(event, payload);
  }

  emitToRoles<TPayload>(roles: UserRole[], event: string, payload: TPayload) {
    const uniqueRoles = [...new Set(roles)];

    for (const role of uniqueRoles) {
      this.emitToRole(role, event, payload);
    }
  }
}
