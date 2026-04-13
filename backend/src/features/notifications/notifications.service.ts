import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { RealtimeEmitterService } from '../realtime/core/realtime-emitter.service';
import { RealtimeServerEvent } from '../realtime/realtime.events';
import {
  NotificationPayload,
  NotificationsReadAllPayload,
} from '../realtime/realtime.types';
import { User, UserRole } from '../users/entities/user.entity';
import {
  Notification,
  NotificationSeverity,
  NotificationType,
} from './entities/notification.entity';

interface CreateNotificationInput {
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
  dedupeKey?: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly emitter: RealtimeEmitterService,
  ) {}

  async listForUser(userId: string, limit = 20) {
    const notifications = await this.notificationsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 50),
    });

    return notifications.map((notification) => this.toPayload(notification));
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationsRepository.save(notification);
      this.emitter.emitToUser(
        userId,
        RealtimeServerEvent.NOTIFICATION_UPDATED,
        this.toPayload(notification),
      );
    }

    return this.toPayload(notification);
  }

  async markAllAsRead(userId: string) {
    const unreadNotifications = await this.notificationsRepository.find({
      where: {
        userId,
        isRead: false,
      },
    });

    if (!unreadNotifications.length) {
      return {
        notificationIds: [],
        readAt: new Date().toISOString(),
      } satisfies NotificationsReadAllPayload;
    }

    const readAt = new Date();
    for (const notification of unreadNotifications) {
      notification.isRead = true;
      notification.readAt = readAt;
    }

    await this.notificationsRepository.save(unreadNotifications);
    const payload: NotificationsReadAllPayload = {
      notificationIds: unreadNotifications.map((notification) => notification.id),
      readAt: readAt.toISOString(),
    };
    this.emitter.emitToUser(
      userId,
      RealtimeServerEvent.NOTIFICATIONS_READ_ALL,
      payload,
    );

    return payload;
  }

  async createForRoles(
    roles: UserRole[],
    input: CreateNotificationInput,
    options?: {
      excludeUserIds?: string[];
      skipExistingUnresolved?: boolean;
    },
  ) {
    const recipients = await this.usersRepository.find({
      where: { role: In(roles) },
      select: ['id'],
    });

    return this.createForUserIds(
      recipients.map((recipient) => recipient.id),
      input,
      options,
    );
  }

  async createForUserIds(
    userIds: string[],
    input: CreateNotificationInput,
    options?: {
      excludeUserIds?: string[];
      skipExistingUnresolved?: boolean;
    },
  ) {
    const recipientIds = [...new Set(userIds)].filter(
      (userId) => !options?.excludeUserIds?.includes(userId),
    );

    if (!recipientIds.length) {
      return [];
    }

    const metadata = input.metadata ?? null;
    const dedupeKey = input.dedupeKey ?? null;
    let existingByUserId = new Map<string, Notification>();

    if (dedupeKey && options?.skipExistingUnresolved !== false) {
      const existing = await this.notificationsRepository.find({
        where: {
          userId: In(recipientIds),
          dedupeKey,
          resolvedAt: IsNull(),
        },
      });
      existingByUserId = new Map(
        existing.map((notification) => [notification.userId, notification]),
      );
    }

    const createdNotifications: Notification[] = [];

    for (const userId of recipientIds) {
      if (existingByUserId.has(userId)) {
        continue;
      }

      createdNotifications.push(
        this.notificationsRepository.create({
          userId,
          type: input.type,
          severity: input.severity,
          title: input.title,
          body: input.body,
          metadata,
          dedupeKey,
          isRead: false,
          readAt: null,
          isResolved: false,
          resolvedAt: null,
        }),
      );
    }

    if (!createdNotifications.length) {
      return [];
    }

    const savedNotifications = await this.notificationsRepository.save(
      createdNotifications,
    );

    for (const notification of savedNotifications) {
      this.emitter.emitToUser(
        notification.userId,
        RealtimeServerEvent.NOTIFICATION_CREATED,
        this.toPayload(notification),
      );
    }

    return savedNotifications.map((notification) => this.toPayload(notification));
  }

  async resolveByDedupeKeys(userIds: string[], dedupeKeys: string[]) {
    const uniqueUserIds = [...new Set(userIds)];
    const uniqueDedupeKeys = [...new Set(dedupeKeys)].filter(Boolean);

    if (!uniqueUserIds.length || !uniqueDedupeKeys.length) {
      return [];
    }

    const notifications = await this.notificationsRepository.find({
      where: {
        userId: In(uniqueUserIds),
        dedupeKey: In(uniqueDedupeKeys),
        resolvedAt: IsNull(),
      },
    });

    if (!notifications.length) {
      return [];
    }

    const resolvedAt = new Date();
    for (const notification of notifications) {
      notification.isResolved = true;
      notification.resolvedAt = resolvedAt;
    }

    const savedNotifications = await this.notificationsRepository.save(
      notifications,
    );

    for (const notification of savedNotifications) {
      this.emitter.emitToUser(
        notification.userId,
        RealtimeServerEvent.NOTIFICATION_UPDATED,
        this.toPayload(notification),
      );
    }

    return savedNotifications.map((notification) => this.toPayload(notification));
  }

  private toPayload(notification: Notification): NotificationPayload {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      severity: notification.severity,
      title: notification.title,
      body: notification.body,
      metadata: notification.metadata ?? null,
      dedupeKey: notification.dedupeKey ?? null,
      isRead: notification.isRead,
      readAt: notification.readAt?.toISOString() ?? null,
      isResolved: notification.isResolved,
      resolvedAt: notification.resolvedAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
