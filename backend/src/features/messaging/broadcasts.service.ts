import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  NotificationSeverity,
  NotificationType,
} from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeEmitterService } from '../realtime/core/realtime-emitter.service';
import { RealtimeServerEvent } from '../realtime/realtime.events';
import {
  BroadcastPayload,
  RealtimeUserSummary,
} from '../realtime/realtime.types';
import { User, UserRole } from '../users/entities/user.entity';
import { SendBroadcastDto } from './dto/send-broadcast.dto';
import { BroadcastMessage } from './entities/broadcast-message.entity';

const STAFF_ROLES = [UserRole.ADMIN, UserRole.EMPLOYEE];

@Injectable()
export class BroadcastsService {
  constructor(
    @InjectRepository(BroadcastMessage)
    private readonly broadcastsRepository: Repository<BroadcastMessage>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly emitter: RealtimeEmitterService,
  ) {}

  async listRecentForUser(user: User, limit = 20) {
    if (!STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenException('Broadcasts are limited to staff roles.');
    }

    const broadcasts = await this.broadcastsRepository
      .createQueryBuilder('broadcast')
      .leftJoinAndSelect('broadcast.sender', 'sender')
      .where(':role = ANY(broadcast.audienceRoles)', { role: user.role })
      .orderBy('broadcast.createdAt', 'DESC')
      .limit(Math.min(Math.max(limit, 1), 50))
      .getMany();

    return broadcasts.map((broadcast) => this.toPayload(broadcast));
  }

  async createAndDispatch(sender: User, dto: SendBroadcastDto) {
    if (!STAFF_ROLES.includes(sender.role)) {
      throw new ForbiddenException('Only staff can send broadcast messages.');
    }

    const audienceRoles = this.normalizeAudienceRoles(dto.audienceRoles);
    const title = dto.title.trim();
    const body = dto.body.trim();
    const broadcast = await this.broadcastsRepository.save(
      this.broadcastsRepository.create({
        senderId: sender.id,
        title,
        body,
        audienceRoles,
      }),
    );

    const payload = this.toPayload({
      ...broadcast,
      sender,
    } as BroadcastMessage);

    const recipients = await this.usersRepository.find({
      where: {
        role: In(audienceRoles),
      },
      select: ['id'],
    });

    await this.notificationsService.createForUserIds(
      recipients.map((recipient) => recipient.id),
      {
        type: NotificationType.BROADCAST,
        severity: NotificationSeverity.INFO,
        title,
        body,
        metadata: {
          broadcastId: broadcast.id,
          audienceRoles,
          senderId: sender.id,
        },
        dedupeKey: null,
      },
      {
        skipExistingUnresolved: false,
      },
    );

    this.emitter.emitToRoles(
      audienceRoles,
      RealtimeServerEvent.BROADCAST_CREATED,
      payload,
    );

    return payload;
  }

  private normalizeAudienceRoles(audienceRoles?: UserRole[]) {
    const roles = (audienceRoles?.length ? audienceRoles : STAFF_ROLES).filter(
      (role) => STAFF_ROLES.includes(role),
    );

    return [...new Set(roles)];
  }

  private toUserSummary(user: User): RealtimeUserSummary {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: `${user.firstName} ${user.lastName}`.trim() || user.email,
      role: user.role,
    };
  }

  private toPayload(broadcast: BroadcastMessage): BroadcastPayload {
    return {
      id: broadcast.id,
      title: broadcast.title,
      body: broadcast.body,
      audienceRoles: broadcast.audienceRoles,
      sender: this.toUserSummary(broadcast.sender),
      createdAt: broadcast.createdAt.toISOString(),
    };
  }
}
