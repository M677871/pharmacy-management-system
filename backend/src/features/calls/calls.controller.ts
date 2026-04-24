import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCaptionSegmentDto } from '../media/dto/create-caption-segment.dto';
import { CreateRecordingDto } from '../media/dto/create-recording.dto';
import {
  RecordingStorageService,
  UploadedRecordingFile,
} from '../media/recording-storage.service';
import { User } from '../users/entities/user.entity';
import { CallsService } from './calls.service';
import { StartCallDto } from './dto/start-call.dto';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(
    private readonly callsService: CallsService,
    private readonly recordingStorage: RecordingStorageService,
  ) {}

  @Get()
  listMine(@CurrentUser() user: User, @Query('limit') limit?: string) {
    return this.callsService.listMine(user, Number(limit ?? 50));
  }

  @Post()
  startCall(@CurrentUser() user: User, @Body() dto: StartCallDto) {
    return this.callsService.startCall(user, dto);
  }

  @Get(':callId')
  getMine(
    @CurrentUser() user: User,
    @Param('callId', ParseUUIDPipe) callId: string,
  ) {
    return this.callsService.getMine(user, callId);
  }

  @Post(':callId/accept')
  acceptCall(
    @CurrentUser() user: User,
    @Param('callId', ParseUUIDPipe) callId: string,
  ) {
    return this.callsService.acceptCall(user, callId);
  }

  @Post(':callId/reject')
  rejectCall(
    @CurrentUser() user: User,
    @Param('callId', ParseUUIDPipe) callId: string,
  ) {
    return this.callsService.rejectCall(user, callId);
  }

  @Post(':callId/end')
  endCall(
    @CurrentUser() user: User,
    @Param('callId', ParseUUIDPipe) callId: string,
  ) {
    return this.callsService.endCall(user, callId);
  }

  @Post(':callId/fail')
  failCall(
    @CurrentUser() user: User,
    @Param('callId', ParseUUIDPipe) callId: string,
  ) {
    return this.callsService.failCall(user, callId);
  }

  @Get(':callId/recordings')
  listRecordings(
    @CurrentUser() user: User,
    @Param('callId', ParseUUIDPipe) callId: string,
  ) {
    return this.callsService.listRecordings(user, callId);
  }

  @Post(':callId/recordings')
  @UseInterceptors(FileInterceptor('recording'))
  createRecording(
    @CurrentUser() user: User,
    @Param('callId', ParseUUIDPipe) callId: string,
    @Body() dto: CreateRecordingDto,
    @UploadedFile() file?: UploadedRecordingFile,
  ) {
    return this.callsService.createRecording(user, callId, dto, file);
  }

  @Get('recordings/:recordingId/download')
  async downloadRecording(
    @CurrentUser() user: User,
    @Param('recordingId', ParseUUIDPipe) recordingId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const recording = await this.callsService.getRecordingForDownload(
      user,
      recordingId,
    );
    response.set({
      'Content-Type': recording.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="call-recording-${recording.id}.webm"`,
      'Cache-Control': 'private, no-store',
    });
    return new StreamableFile(
      this.recordingStorage.createReadStream(recording.recordingPath as string),
    );
  }

  @Get(':callId/captions')
  listCaptions(
    @CurrentUser() user: User,
    @Param('callId', ParseUUIDPipe) callId: string,
  ) {
    return this.callsService.listCaptions(user, callId);
  }

  @Post(':callId/captions')
  createCaption(
    @CurrentUser() user: User,
    @Param('callId', ParseUUIDPipe) callId: string,
    @Body() dto: CreateCaptionSegmentDto,
  ) {
    return this.callsService.createCaption(user, callId, dto);
  }
}
