import { UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BroadcastsService } from '../messaging/broadcasts.service';
import { DeleteDirectMessageDto } from '../messaging/dto/delete-direct-message.dto';
import { MarkThreadReadDto } from '../messaging/dto/mark-thread-read.dto';
import { SendBroadcastDto } from '../messaging/dto/send-broadcast.dto';
import { SendDirectMessageDto } from '../messaging/dto/send-direct-message.dto';
import { UpdateDirectMessageDto } from '../messaging/dto/update-direct-message.dto';
import { ChatService } from '../messaging/chat.service';
import { MarkNotificationReadDto } from '../notifications/dto/mark-notification-read.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';
import { PresenceService } from './core/presence.service';
import { RealtimeEmitterService } from './core/realtime-emitter.service';
import { SocketAuthService } from './core/socket-auth.service';
import { PresencePingDto } from './dto/presence-ping.dto';
import {
  REALTIME_NAMESPACE,
  RealtimeClientEvent,
  RealtimeServerEvent,
  realtimeRoom,
} from './realtime.events';

@WebSocketGateway({
  namespace: REALTIME_NAMESPACE,
  cors: {
    origin: true,
    credentials: true,
  },
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly socketAuthService: SocketAuthService,
    private readonly emitter: RealtimeEmitterService,
    private readonly presenceService: PresenceService,
    private readonly notificationsService: NotificationsService,
    private readonly chatService: ChatService,
    private readonly broadcastsService: BroadcastsService,
  ) {}

  afterInit(server: Server) {
    this.emitter.setServer(server);
  }

  async handleConnection(client: Socket) {
    const user = await this.socketAuthService
      .authenticate(client.handshake)
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Socket authentication failed.';
        client.emit('exception', { message });
        client.disconnect(true);
        return null;
      });

    if (!user) {
      return;
    }

    client.data.user = user;
    await client.join(realtimeRoom.user(user.id));
    await client.join(realtimeRoom.role(user.role));

    this.presenceService.registerConnection(client.id, user);
    client.emit(RealtimeServerEvent.SYSTEM_CONNECTED, {
      userId: user.id,
      connectedAt: new Date().toISOString(),
    });
    client.emit(
      RealtimeServerEvent.PRESENCE_SNAPSHOT,
      this.presenceService.getVisiblePresenceSnapshot(user),
    );
  }

  handleDisconnect(client: Socket) {
    this.presenceService.unregisterConnection(client.id);
  }

  @SubscribeMessage(RealtimeClientEvent.PRESENCE_PING)
  handlePresencePing(
    @ConnectedSocket() client: Socket,
    @MessageBody() _dto: PresencePingDto,
  ) {
    const user = this.getSocketUser(client);
    this.presenceService.markActive(user.id);
    return { ok: true };
  }

  @SubscribeMessage(RealtimeClientEvent.NOTIFICATION_MARK_READ)
  async markNotificationRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: MarkNotificationReadDto,
  ) {
    const user = this.getSocketUser(client);
    return this.notificationsService.markAsRead(user.id, dto.notificationId);
  }

  @SubscribeMessage(RealtimeClientEvent.NOTIFICATIONS_MARK_ALL_READ)
  async markAllNotificationsRead(@ConnectedSocket() client: Socket) {
    const user = this.getSocketUser(client);
    return this.notificationsService.markAllAsRead(user.id);
  }

  @SubscribeMessage(RealtimeClientEvent.CHAT_SEND)
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendDirectMessageDto,
  ) {
    const user = this.getSocketUser(client);
    this.presenceService.markActive(user.id);
    return this.chatService.sendDirectMessage(user, dto);
  }

  @SubscribeMessage(RealtimeClientEvent.CHAT_UPDATE)
  async updateMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: UpdateDirectMessageDto,
  ) {
    const user = this.getSocketUser(client);
    this.presenceService.markActive(user.id);
    return this.chatService.updateDirectMessage(user, dto);
  }

  @SubscribeMessage(RealtimeClientEvent.CHAT_DELETE)
  async deleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: DeleteDirectMessageDto,
  ) {
    const user = this.getSocketUser(client);
    this.presenceService.markActive(user.id);
    return this.chatService.deleteDirectMessage(user, dto);
  }

  @SubscribeMessage(RealtimeClientEvent.CHAT_MARK_THREAD_READ)
  async markThreadRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: MarkThreadReadDto,
  ) {
    const user = this.getSocketUser(client);
    this.presenceService.markActive(user.id);
    return this.chatService.markThreadAsRead(user, dto.contactId);
  }

  @SubscribeMessage(RealtimeClientEvent.BROADCAST_SEND)
  async sendBroadcast(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendBroadcastDto,
  ) {
    const user = this.getSocketUser(client);
    this.presenceService.markActive(user.id);
    return this.broadcastsService.createAndDispatch(user, dto);
  }

  private getSocketUser(client: Socket) {
    const user = client.data.user as User | undefined;

    if (!user) {
      throw new WsException('Socket user is not authenticated.');
    }

    return user;
  }
}
