import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import { BroadcastsService } from './broadcasts.service';
import { ChatService } from './chat.service';
import { DeleteDirectMessageDto } from './dto/delete-direct-message.dto';
import { ListBroadcastsQueryDto } from './dto/list-broadcasts-query.dto';
import { ListContactsQueryDto } from './dto/list-contacts-query.dto';
import { ListThreadQueryDto } from './dto/list-thread-query.dto';
import { MarkThreadReadDto } from './dto/mark-thread-read.dto';
import { SendBroadcastDto } from './dto/send-broadcast.dto';
import { SendDirectMessageDto } from './dto/send-direct-message.dto';
import { UpdateDirectMessageDto } from './dto/update-direct-message.dto';
import {
  JsonObject,
  toValidatedDto,
} from '../../common/graphql/graphql-dto.util';

@Resolver()
@UseGuards(JwtAuthGuard)
export class MessagingResolver {
  constructor(
    private readonly chatService: ChatService,
    private readonly broadcastsService: BroadcastsService,
  ) {}

  @Query(() => GraphQLJSON, { name: 'messageContacts' })
  async listContacts(
    @CurrentUser() user: User,
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(ListContactsQueryDto, input);
    return this.chatService.listContacts(user, query.search);
  }

  @Query(() => GraphQLJSON, { name: 'messageThreads' })
  listThreads(@CurrentUser() user: User) {
    return this.chatService.listThreads(user);
  }

  @Query(() => GraphQLJSON, { name: 'messageThread' })
  async listThread(
    @CurrentUser() user: User,
    @Args('contactId', { type: () => ID }, ParseUUIDPipe) contactId: string,
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(ListThreadQueryDto, input);
    return this.chatService.listThread(user, contactId, query.limit);
  }

  @Query(() => GraphQLJSON, { name: 'broadcastMessages' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async listBroadcasts(
    @CurrentUser() user: User,
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(ListBroadcastsQueryDto, input);
    return this.broadcastsService.listRecentForUser(user, query.limit);
  }

  @Mutation(() => GraphQLJSON, { name: 'sendDirectMessage' })
  async sendDirectMessage(
    @CurrentUser() user: User,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(SendDirectMessageDto, input);
    return this.chatService.sendDirectMessage(user, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateDirectMessage' })
  async updateDirectMessage(
    @CurrentUser() user: User,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(UpdateDirectMessageDto, input);
    return this.chatService.updateDirectMessage(user, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'deleteDirectMessage' })
  async deleteDirectMessage(
    @CurrentUser() user: User,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(DeleteDirectMessageDto, input);
    return this.chatService.deleteDirectMessage(user, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'markMessageThreadRead' })
  async markThreadRead(
    @CurrentUser() user: User,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(MarkThreadReadDto, input);
    return this.chatService.markThreadAsRead(user, dto.contactId);
  }

  @Mutation(() => GraphQLJSON, { name: 'sendBroadcastMessage' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async sendBroadcast(
    @CurrentUser() user: User,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(SendBroadcastDto, input);
    return this.broadcastsService.createAndDispatch(user, dto);
  }
}
