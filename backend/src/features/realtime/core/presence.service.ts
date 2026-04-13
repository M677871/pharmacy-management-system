import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { User, UserRole } from '../../users/entities/user.entity';
import { RealtimeEmitterService } from './realtime-emitter.service';
import { RealtimeServerEvent } from '../realtime.events';
import { PresenceEntry } from '../realtime.types';

interface PresenceConnection {
  socketId: string;
  user: User;
  connectedAt: Date;
  lastActiveAt: Date;
}

const ACTIVE_WINDOW_MS = 75_000;
const PRESENCE_SWEEP_MS = 30_000;

@Injectable()
export class PresenceService implements OnModuleInit, OnModuleDestroy {
  private readonly connectionsBySocketId = new Map<string, PresenceConnection>();
  private readonly socketIdsByUserId = new Map<string, Set<string>>();
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(private readonly emitter: RealtimeEmitterService) {}

  onModuleInit() {
    this.sweepTimer = setInterval(() => {
      this.emitStalePresenceTransitions();
    }, PRESENCE_SWEEP_MS);
  }

  onModuleDestroy() {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }

  registerConnection(socketId: string, user: User) {
    const connection: PresenceConnection = {
      socketId,
      user,
      connectedAt: new Date(),
      lastActiveAt: new Date(),
    };

    this.connectionsBySocketId.set(socketId, connection);
    const previousEntry = this.buildPresenceEntry(user.id);
    const socketIds = this.socketIdsByUserId.get(user.id) ?? new Set<string>();
    socketIds.add(socketId);
    this.socketIdsByUserId.set(user.id, socketIds);
    this.emitPresenceChange(user.id, previousEntry);
  }

  unregisterConnection(socketId: string) {
    const connection = this.connectionsBySocketId.get(socketId);

    if (!connection) {
      return;
    }

    const previousEntry = this.buildPresenceEntry(connection.user.id);
    this.connectionsBySocketId.delete(socketId);
    const socketIds = this.socketIdsByUserId.get(connection.user.id);

    if (socketIds) {
      socketIds.delete(socketId);

      if (!socketIds.size) {
        this.socketIdsByUserId.delete(connection.user.id);
      }
    }

    this.emitPresenceChange(connection.user.id, previousEntry);
  }

  markActive(userId: string) {
    const previousEntry = this.buildPresenceEntry(userId);
    const socketIds = this.socketIdsByUserId.get(userId);

    if (!socketIds?.size) {
      return;
    }

    const now = new Date();
    for (const socketId of socketIds) {
      const connection = this.connectionsBySocketId.get(socketId);

      if (connection) {
        connection.lastActiveAt = now;
      }
    }

    this.emitPresenceChange(userId, previousEntry);
  }

  isOnline(userId: string) {
    return (this.socketIdsByUserId.get(userId)?.size ?? 0) > 0;
  }

  getOnlineUserIdsByRole(role: UserRole) {
    const userIds = new Set<string>();

    for (const connection of this.connectionsBySocketId.values()) {
      if (connection.user.role === role) {
        userIds.add(connection.user.id);
      }
    }

    return [...userIds];
  }

  getVisiblePresenceSnapshot(viewer: User) {
    return [...this.socketIdsByUserId.keys()]
      .map((userId) => this.buildPresenceEntry(userId))
      .filter((entry): entry is PresenceEntry => Boolean(entry))
      .filter((entry) => this.canViewerSeeUser(viewer, entry.userId, entry.role))
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  private emitStalePresenceTransitions() {
    for (const userId of this.socketIdsByUserId.keys()) {
      const previousEntry = this.buildPresenceEntry(
        userId,
        new Date(Date.now() - ACTIVE_WINDOW_MS),
      );

      if (!previousEntry) {
        continue;
      }

      this.emitPresenceChange(userId, previousEntry);
    }
  }

  private emitPresenceChange(userId: string, previousEntry: PresenceEntry | null) {
    const nextEntry = this.buildPresenceEntry(userId);

    if (this.isSamePresence(previousEntry, nextEntry)) {
      return;
    }

    const subjectRole = nextEntry?.role ?? previousEntry?.role;

    if (!subjectRole) {
      return;
    }

    const payload = nextEntry ?? this.buildOfflinePayload(previousEntry, userId);

    if (!payload) {
      return;
    }

    this.emitter.emitToUser(userId, RealtimeServerEvent.PRESENCE_CHANGED, payload);

    if (subjectRole === UserRole.CUSTOMER) {
      this.emitter.emitToRoles(
        [UserRole.ADMIN, UserRole.EMPLOYEE],
        RealtimeServerEvent.PRESENCE_CHANGED,
        payload,
      );
      return;
    }

    this.emitter.emitToRoles(
      [UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.CUSTOMER],
      RealtimeServerEvent.PRESENCE_CHANGED,
      payload,
    );
  }

  private buildPresenceEntry(
    userId: string,
    activeCutoff = new Date(Date.now() - ACTIVE_WINDOW_MS),
  ): PresenceEntry | null {
    const socketIds = this.socketIdsByUserId.get(userId);

    if (!socketIds?.size) {
      return null;
    }

    const connections = [...socketIds]
      .map((socketId) => this.connectionsBySocketId.get(socketId))
      .filter((connection): connection is PresenceConnection => Boolean(connection));

    if (!connections.length) {
      return null;
    }

    const user = connections[0].user;
    const lastActiveAt = new Date(
      Math.max(...connections.map((connection) => connection.lastActiveAt.getTime())),
    );

    return {
      userId: user.id,
      displayName: this.getDisplayName(user),
      role: user.role,
      status: lastActiveAt >= activeCutoff ? 'active' : 'online',
      connectionCount: connections.length,
      lastActiveAt: lastActiveAt.toISOString(),
      lastSeenAt: null,
    };
  }

  private buildOfflinePayload(
    previousEntry: PresenceEntry | null,
    userId: string,
  ): PresenceEntry | null {
    if (!previousEntry) {
      return null;
    }

    return {
      ...previousEntry,
      userId,
      status: 'offline',
      connectionCount: 0,
      lastSeenAt: new Date().toISOString(),
    };
  }

  private canViewerSeeUser(
    viewer: User,
    subjectUserId: string,
    subjectRole: UserRole,
  ) {
    if (viewer.id === subjectUserId) {
      return true;
    }

    if (viewer.role === UserRole.CUSTOMER) {
      return (
        subjectRole === UserRole.ADMIN || subjectRole === UserRole.EMPLOYEE
      );
    }

    return true;
  }

  private getDisplayName(user: User) {
    return `${user.firstName} ${user.lastName}`.trim() || user.email;
  }

  private isSamePresence(
    previousEntry: PresenceEntry | null,
    nextEntry: PresenceEntry | null,
  ) {
    if (!previousEntry && !nextEntry) {
      return true;
    }

    if (!previousEntry || !nextEntry) {
      return false;
    }

    return (
      previousEntry.status === nextEntry.status &&
      previousEntry.connectionCount === nextEntry.connectionCount
    );
  }
}
