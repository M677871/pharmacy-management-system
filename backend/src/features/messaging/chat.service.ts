import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RealtimeEmitterService } from '../realtime/core/realtime-emitter.service';
import { RealtimeServerEvent } from '../realtime/realtime.events';
import {
  ChatMessagePayload,
  ChatThreadReadPayload,
  ChatThreadSummaryPayload,
  RealtimeUserSummary,
} from '../realtime/realtime.types';
import { User, UserRole } from '../users/entities/user.entity';
import { SendDirectMessageDto } from './dto/send-direct-message.dto';
import { UpdateDirectMessageDto } from './dto/update-direct-message.dto';
import { DeleteDirectMessageDto } from './dto/delete-direct-message.dto';
import { ChatMessage } from './entities/chat-message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly messagesRepository: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly emitter: RealtimeEmitterService,
  ) {}

  async listContacts(viewer: User, search?: string) {
    const allowedRoles = this.getAllowedContactRoles(viewer.role);
    const builder = this.usersRepository
      .createQueryBuilder('user')
      .where('user.id != :viewerId', { viewerId: viewer.id })
      .andWhere('user.role IN (:...allowedRoles)', { allowedRoles })
      .orderBy('user.firstName', 'ASC')
      .addOrderBy('user.lastName', 'ASC')
      .addOrderBy('user.email', 'ASC');

    if (search?.trim()) {
      builder.andWhere(
        `(
          user.firstName ILIKE :search
          OR user.lastName ILIKE :search
          OR user.email ILIKE :search
        )`,
        { search: `%${search.trim()}%` },
      );
    }

    const contacts = await builder.getMany();
    return contacts.map((contact) => this.toUserSummary(contact));
  }

  async listThreads(viewer: User) {
    const [messages, unreadRows] = await Promise.all([
      this.messagesRepository.find({
        where: [{ senderId: viewer.id }, { recipientId: viewer.id }],
        relations: {
          sender: true,
          recipient: true,
        },
        order: { createdAt: 'DESC' },
        take: 300,
      }),
      this.messagesRepository
        .createQueryBuilder('message')
        .select('message.senderId', 'contactId')
        .addSelect('COUNT(*)', 'count')
        .where('message.recipientId = :viewerId', { viewerId: viewer.id })
        .andWhere('message.readAt IS NULL')
        .groupBy('message.senderId')
        .getRawMany<{ contactId: string; count: string }>(),
    ]);

    const unreadByContactId = new Map(
      unreadRows.map((row) => [row.contactId, Number(row.count)]),
    );
    const threadsByContactId = new Map<string, ChatThreadSummaryPayload>();

    for (const message of messages) {
      const contact =
        message.senderId === viewer.id ? message.recipient : message.sender;

      if (!this.isAllowedContactRole(viewer.role, contact.role)) {
        continue;
      }

      if (!threadsByContactId.has(contact.id)) {
        threadsByContactId.set(contact.id, {
          contact: this.toUserSummary(contact),
          lastMessage: this.toMessagePayload(message),
          unreadCount: unreadByContactId.get(contact.id) ?? 0,
          isClosed: false,
          closedAt: null,
        });
      }
    }

    return [...threadsByContactId.values()].sort((left, right) =>
      right.lastMessage.createdAt.localeCompare(left.lastMessage.createdAt),
    );
  }

  async listThread(viewer: User, contactId: string, limit = 100) {
    const contact = await this.getMessageRecipientOrThrow(viewer, contactId);
    const messages = await this.messagesRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.recipient', 'recipient')
      .where(
        `
          (message.senderId = :viewerId AND message.recipientId = :contactId)
          OR
          (message.senderId = :contactId AND message.recipientId = :viewerId)
        `,
        {
          viewerId: viewer.id,
          contactId: contact.id,
        },
      )
      .orderBy('message.createdAt', 'DESC')
      .limit(Math.min(Math.max(limit, 1), 200))
      .getMany();

    return messages
      .reverse()
      .map((message) => this.toMessagePayload(message));
  }

  async sendDirectMessage(sender: User, dto: SendDirectMessageDto) {
    const recipient = await this.getMessageRecipientOrThrow(
      sender,
      dto.recipientId,
    );
    const body = dto.body.trim();

    if (!body) {
      throw new BadRequestException('Message body is required.');
    }

    const message = await this.messagesRepository.save(
      this.messagesRepository.create({
        senderId: sender.id,
        recipientId: recipient.id,
        body,
        readAt: null,
      }),
    );

    const payload = this.toMessagePayload({
      ...message,
      sender,
      recipient,
    } as ChatMessage);

    this.emitter.emitToUsers(
      [sender.id, recipient.id],
      RealtimeServerEvent.CHAT_MESSAGE_CREATED,
      payload,
    );

    return payload;
  }

  async updateDirectMessage(sender: User, dto: UpdateDirectMessageDto) {
    const message = await this.messagesRepository.findOne({
      where: { id: dto.messageId },
      relations: {
        sender: true,
        recipient: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    if (message.senderId !== sender.id) {
      throw new ForbiddenException('You can only edit your own messages.');
    }

    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Message body is required.');
    }

    message.body = body;
    const updatedMessage = await this.messagesRepository.save(message);
    const payload = this.toMessagePayload(updatedMessage);

    this.emitter.emitToUsers(
      [payload.senderId, payload.recipientId],
      RealtimeServerEvent.CHAT_MESSAGE_UPDATED,
      payload,
    );

    return payload;
  }

  async deleteDirectMessage(sender: User, dto: DeleteDirectMessageDto) {
    const message = await this.messagesRepository.findOne({
      where: { id: dto.messageId },
      relations: {
        sender: true,
        recipient: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    if (message.senderId !== sender.id) {
      throw new ForbiddenException('You can only delete your own messages.');
    }

    const payload = this.toMessagePayload(message);
    await this.messagesRepository.remove(message);

    this.emitter.emitToUsers(
      [payload.senderId, payload.recipientId],
      RealtimeServerEvent.CHAT_MESSAGE_DELETED,
      payload,
    );

    return payload;
  }

  async markThreadAsRead(viewer: User, contactId: string) {
    const contact = await this.getMessageRecipientOrThrow(viewer, contactId);
    const unreadMessages = await this.messagesRepository.find({
      where: {
        senderId: contact.id,
        recipientId: viewer.id,
        readAt: IsNull(),
      },
    });

    if (!unreadMessages.length) {
      return {
        contactId: contact.id,
        userId: viewer.id,
        readAt: new Date().toISOString(),
        messageIds: [],
      } satisfies ChatThreadReadPayload;
    }

    const readAt = new Date();
    for (const message of unreadMessages) {
      message.readAt = readAt;
    }

    await this.messagesRepository.save(unreadMessages);

    const payload: ChatThreadReadPayload = {
      contactId: contact.id,
      userId: viewer.id,
      readAt: readAt.toISOString(),
      messageIds: unreadMessages.map((message) => message.id),
    };

    this.emitter.emitToUsers(
      [viewer.id, contact.id],
      RealtimeServerEvent.CHAT_THREAD_READ,
      payload,
    );

    return payload;
  }

  private async getMessageRecipientOrThrow(viewer: User, recipientId: string) {
    if (viewer.id === recipientId) {
      throw new BadRequestException('You cannot message yourself.');
    }

    const recipient = await this.usersRepository.findOne({
      where: { id: recipientId },
    });

    if (!recipient) {
      throw new NotFoundException('User not found.');
    }

    if (!this.isAllowedContactRole(viewer.role, recipient.role)) {
      throw new ForbiddenException(
        'You do not have access to message this user.',
      );
    }

    return recipient;
  }

  private getAllowedContactRoles(role: UserRole) {
    if (role === UserRole.CUSTOMER) {
      return [UserRole.ADMIN, UserRole.EMPLOYEE];
    }

    return [UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.CUSTOMER];
  }

  private isAllowedContactRole(viewerRole: UserRole, contactRole: UserRole) {
    return this.getAllowedContactRoles(viewerRole).includes(contactRole);
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

  private toMessagePayload(message: ChatMessage): ChatMessagePayload {
    return {
      id: message.id,
      body: message.body,
      senderId: message.senderId,
      recipientId: message.recipientId,
      readAt: message.readAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
      sender: this.toUserSummary(message.sender),
      recipient: this.toUserSummary(message.recipient),
    };
  }
}
