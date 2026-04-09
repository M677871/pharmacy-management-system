import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import { BroadcastsService } from './broadcasts.service';
import { ChatService } from './chat.service';
import { ListBroadcastsQueryDto } from './dto/list-broadcasts-query.dto';
import { ListContactsQueryDto } from './dto/list-contacts-query.dto';
import { ListThreadQueryDto } from './dto/list-thread-query.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(
    private readonly chatService: ChatService,
    private readonly broadcastsService: BroadcastsService,
  ) {}

  @Get('contacts')
  listContacts(
    @CurrentUser() user: User,
    @Query() query: ListContactsQueryDto,
  ) {
    return this.chatService.listContacts(user, query.search);
  }

  @Get('threads')
  listThreads(@CurrentUser() user: User) {
    return this.chatService.listThreads(user);
  }

  @Get('threads/:contactId')
  listThread(
    @CurrentUser() user: User,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Query() query: ListThreadQueryDto,
  ) {
    return this.chatService.listThread(user, contactId, query.limit);
  }

  @Get('broadcasts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  listBroadcasts(
    @CurrentUser() user: User,
    @Query() query: ListBroadcastsQueryDto,
  ) {
    return this.broadcastsService.listRecentForUser(user, query.limit);
  }
}
