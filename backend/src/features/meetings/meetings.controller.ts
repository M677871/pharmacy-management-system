import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateCaptionSegmentDto } from '../media/dto/create-caption-segment.dto';
import { CreateRecordingDto } from '../media/dto/create-recording.dto';
import {
  RecordingStorageService,
  UploadedRecordingFile,
} from '../media/recording-storage.service';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { CreateMeetingNoteDto } from './dto/create-meeting-note.dto';
import { UpdateMeetingNoteDto } from './dto/update-meeting-note.dto';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly recordingStorage: RecordingStorageService,
  ) {}

  @Get('eligible-participants')
  listEligibleParticipants(
    @CurrentUser() user: User,
    @Query('search') search?: string,
  ) {
    return this.meetingsService.listEligibleParticipants(user, search);
  }

  @Get()
  listMine(@CurrentUser() user: User) {
    return this.meetingsService.listMine(user);
  }

  @Post()
  createMeeting(@CurrentUser() user: User, @Body() dto: CreateMeetingDto) {
    return this.meetingsService.createMeeting(user, dto);
  }

  @Get(':meetingId')
  getMeeting(
    @CurrentUser() user: User,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingsService.getMeeting(user, meetingId);
  }

  @Post(':meetingId/join')
  joinMeeting(
    @CurrentUser() user: User,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingsService.joinMeeting(user, meetingId);
  }

  @Post(':meetingId/leave')
  leaveMeeting(
    @CurrentUser() user: User,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingsService.leaveMeeting(user, meetingId);
  }

  @Post(':meetingId/end')
  endMeeting(
    @CurrentUser() user: User,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingsService.endMeeting(user, meetingId);
  }

  @Post(':meetingId/cancel')
  cancelMeeting(
    @CurrentUser() user: User,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingsService.cancelMeeting(user, meetingId);
  }

  @Get(':meetingId/notes')
  listNotes(
    @CurrentUser() user: User,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingsService.listNotes(user, meetingId);
  }

  @Post(':meetingId/notes')
  createNote(
    @CurrentUser() user: User,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Body() dto: CreateMeetingNoteDto,
  ) {
    return this.meetingsService.createNote(user, meetingId, dto);
  }

  @Patch(':meetingId/notes/:noteId')
  updateNote(
    @CurrentUser() user: User,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() dto: UpdateMeetingNoteDto,
  ) {
    return this.meetingsService.updateNote(user, meetingId, noteId, dto);
  }

  @Get(':meetingId/recordings')
  listRecordings(
    @CurrentUser() user: User,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingsService.listRecordings(user, meetingId);
  }

  @Post(':meetingId/recordings')
  @UseInterceptors(FileInterceptor('recording'))
  createRecording(
    @CurrentUser() user: User,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Body() dto: CreateRecordingDto,
    @UploadedFile() file?: UploadedRecordingFile,
  ) {
    return this.meetingsService.createRecording(user, meetingId, dto, file);
  }

  @Get('recordings/:recordingId/download')
  async downloadRecording(
    @CurrentUser() user: User,
    @Param('recordingId', ParseUUIDPipe) recordingId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const recording = await this.meetingsService.getRecordingForDownload(
      user,
      recordingId,
    );
    response.set({
      'Content-Type': recording.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="meeting-recording-${recording.id}.webm"`,
      'Cache-Control': 'private, no-store',
    });
    return new StreamableFile(
      this.recordingStorage.createReadStream(recording.recordingPath as string),
    );
  }

  @Get(':meetingId/captions')
  listCaptions(
    @CurrentUser() user: User,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingsService.listCaptions(user, meetingId);
  }

  @Post(':meetingId/captions')
  createCaption(
    @CurrentUser() user: User,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Body() dto: CreateCaptionSegmentDto,
  ) {
    return this.meetingsService.createCaption(user, meetingId, dto);
  }
}
