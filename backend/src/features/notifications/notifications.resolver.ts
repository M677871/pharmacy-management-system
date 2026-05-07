import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationsService } from './notifications.service';
import {
  JsonObject,
  toValidatedDto,
} from '../../common/graphql/graphql-dto.util';

@Resolver()
@UseGuards(JwtAuthGuard)
export class NotificationsResolver {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Query(() => GraphQLJSON, { name: 'notifications' })
  async listMine(
    @CurrentUser() user: User,
    @Args('input', {
      type: () => GraphQLJSONObject,
      nullable: true,
    })
    input?: JsonObject,
  ) {
    const query = await toValidatedDto(ListNotificationsQueryDto, input);
    return this.notificationsService.listForUser(user.id, query.limit);
  }

  @Mutation(() => GraphQLJSON, { name: 'markNotificationRead' })
  markAsRead(
    @CurrentUser() user: User,
    @Args('notificationId', { type: () => ID }, ParseUUIDPipe)
    notificationId: string,
  ) {
    return this.notificationsService.markAsRead(user.id, notificationId);
  }

  @Mutation(() => GraphQLJSON, { name: 'markAllNotificationsRead' })
  markAllAsRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllAsRead(user.id);
  }
}
