import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { getRequiredString } from '../../config/env';
import { ChatService } from '../messaging/chat.service';
import { CreateCaptionSegmentDto } from '../media/dto/create-caption-segment.dto';
import { CreateRecordingDto } from '../media/dto/create-recording.dto';
import {
  TranscriptSegment,
  TranscriptSessionType,
  TranslationStatus,
} from '../media/entities/transcript-segment.entity';
import {
  RecordingStorageService,
  UploadedRecordingFile,
} from '../media/recording-storage.service';
import { TranslationService } from '../media/translation.service';
import {
  NotificationSeverity,
  NotificationType,
} from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeEmitterService } from '../realtime/core/realtime-emitter.service';
import { RealtimeServerEvent } from '../realtime/realtime.events';
import { RealtimeUserSummary } from '../realtime/realtime.types';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { CreateMeetingNoteDto } from './dto/create-meeting-note.dto';
import { MeetingSignalDto } from './dto/meeting-signal.dto';
import { UpdateMeetingNoteDto } from './dto/update-meeting-note.dto';
import { Meeting, MeetingState } from './entities/meeting.entity';
import { MeetingNote } from './entities/meeting-note.entity';
import {
  MeetingParticipant,
  MeetingParticipantRole,
  MeetingParticipantStatus,
} from './entities/meeting-participant.entity';
import { MeetingRecording } from './entities/meeting-recording.entity';

const MEETING_CREATION_WINDOW_MS = 60_000;
const MAX_MEETINGS_PER_WINDOW = 6;

@Injectable()
export class MeetingsService {
  private readonly creationAttemptsByUserId = new Map<string, number[]>();

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingsRepository: Repository<Meeting>,
    @InjectRepository(MeetingParticipant)
    private readonly participantsRepository: Repository<MeetingParticipant>,
    @InjectRepository(MeetingNote)
    private readonly notesRepository: Repository<MeetingNote>,
    @InjectRepository(MeetingRecording)
    private readonly recordingsRepository: Repository<MeetingRecording>,
    @InjectRepository(TranscriptSegment)
    private readonly transcriptsRepository: Repository<TranscriptSegment>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly chatService: ChatService,
    private readonly emitter: RealtimeEmitterService,
    private readonly recordingStorage: RecordingStorageService,
    private readonly translationService: TranslationService,
    private readonly configService: ConfigService,
  ) {}

  async listEligibleParticipants(user: User, search?: string) {
    this.assertStaff(user);
    const builder = this.usersRepository
      .createQueryBuilder('user')
      .where('user.role IN (:...roles)', {
        roles: [UserRole.ADMIN, UserRole.EMPLOYEE],
      })
      .orderBy('user.firstName', 'ASC')
      .addOrderBy('user.lastName', 'ASC')
      .addOrderBy('user.email', 'ASC');

    if (search?.trim()) {
      builder.andWhere(
        `(
          user.firstName ILIKE :search
          OR user.lastName ILIKE :search
          OR user.email ILIKE :search
          OR CONCAT(user.firstName, ' ', user.lastName) ILIKE :search
        )`,
        { search: `%${search.trim()}%` },
      );
    }

    const users = await builder.getMany();
    return users.map((staffUser) => this.toUserSummary(staffUser));
  }

  async createMeeting(creator: User, dto: CreateMeetingDto) {
    this.assertStaff(creator);
    this.assertCreationAllowed(creator.id);

    const scheduledStartAt = new Date(dto.scheduledStartAt);

    if (Number.isNaN(scheduledStartAt.getTime())) {
      throw new BadRequestException('Invalid meeting start time.');
    }

    const uniqueParticipantIds = [
      ...new Set([creator.id, ...dto.participantIds]),
    ];
    const staffUsers = await this.usersRepository.find({
      where: { id: In(uniqueParticipantIds) },
    });
    const usersById = new Map(staffUsers.map((staffUser) => [staffUser.id, staffUser]));

    if (usersById.size !== uniqueParticipantIds.length) {
      throw new BadRequestException('One or more invited participants were not found.');
    }

    for (const participantId of uniqueParticipantIds) {
      const participant = usersById.get(participantId);

      if (!participant || !this.isStaff(participant)) {
        throw new ForbiddenException(
          'Meetings can only include admins and employees.',
        );
      }
    }

    const meeting = await this.meetingsRepository.save(
      this.meetingsRepository.create({
        title: dto.title.trim(),
        agenda: dto.agenda?.trim() || null,
        scheduledStartAt,
        durationMinutes: dto.durationMinutes,
        state: MeetingState.SCHEDULED,
        hostId: creator.id,
        startedAt: null,
        endedAt: null,
      }),
    );

    await this.participantsRepository.save(
      uniqueParticipantIds.map((participantId) =>
        this.participantsRepository.create({
          meetingId: meeting.id,
          userId: participantId,
          role:
            participantId === creator.id
              ? MeetingParticipantRole.HOST
              : MeetingParticipantRole.INVITEE,
          status:
            participantId === creator.id
              ? MeetingParticipantStatus.ACCEPTED
              : MeetingParticipantStatus.INVITED,
          invitedById: creator.id,
          joinedAt: null,
          leftAt: null,
        }),
      ),
    );

    const hydratedMeeting = await this.getMeetingEntityOrThrow(meeting.id);
    await this.dispatchMeetingInvitations(creator, hydratedMeeting);
    this.emitMeetingUpdated(hydratedMeeting);
    return this.toMeetingPayload(hydratedMeeting);
  }

  async listMine(user: User) {
    this.assertStaff(user);
    const participantRows = await this.participantsRepository.find({
      where: { userId: user.id },
      select: ['meetingId'],
    });

    if (!participantRows.length) {
      return [];
    }

    const meetings = await this.meetingsRepository.find({
      where: { id: In(participantRows.map((participant) => participant.meetingId)) },
      relations: {
        host: true,
        participants: {
          user: true,
        },
      },
      order: { scheduledStartAt: 'DESC' },
    });

    return meetings.map((meeting) => this.toMeetingPayload(meeting));
  }

  async getMeeting(user: User, meetingId: string) {
    const meeting = await this.getAuthorizedMeeting(user, meetingId);
    return this.toMeetingPayload(meeting);
  }

  async joinMeeting(user: User, meetingId: string) {
    const meeting = await this.getAuthorizedMeeting(user, meetingId);

    if ([MeetingState.CANCELLED, MeetingState.ENDED].includes(meeting.state)) {
      throw new BadRequestException('This meeting is not joinable.');
    }

    const now = new Date();
    if (meeting.state === MeetingState.SCHEDULED) {
      meeting.state = MeetingState.LIVE;
      meeting.startedAt = now;
      await this.meetingsRepository.save(meeting);
    }

    await this.participantsRepository.update(
      { meetingId, userId: user.id },
      {
        status: MeetingParticipantStatus.JOINED,
        joinedAt: now,
        leftAt: null,
      },
    );

    const updatedMeeting = await this.getMeetingEntityOrThrow(meetingId);
    this.emitMeetingUpdated(updatedMeeting);
    this.emitMeetingParticipantEvent(updatedMeeting, user, 'joined');
    return this.toMeetingPayload(updatedMeeting);
  }

  async leaveMeeting(user: User, meetingId: string) {
    const meeting = await this.getAuthorizedMeeting(user, meetingId);
    const now = new Date();

    await this.participantsRepository.update(
      { meetingId, userId: user.id },
      {
        status: MeetingParticipantStatus.LEFT,
        leftAt: now,
      },
    );

    const updatedMeeting = await this.getMeetingEntityOrThrow(meetingId);
    this.emitMeetingUpdated(updatedMeeting);
    this.emitMeetingParticipantEvent(updatedMeeting, user, 'left');
    return this.toMeetingPayload(updatedMeeting);
  }

  async endMeeting(user: User, meetingId: string) {
    const meeting = await this.getAuthorizedMeeting(user, meetingId);
    this.assertHostOrAdminParticipant(user, meeting);

    if ([MeetingState.CANCELLED, MeetingState.ENDED].includes(meeting.state)) {
      return this.toMeetingPayload(meeting);
    }

    meeting.state = MeetingState.ENDED;
    meeting.endedAt = new Date();
    await this.meetingsRepository.save(meeting);
    const updatedMeeting = await this.getMeetingEntityOrThrow(meetingId);
    this.emitMeetingUpdated(updatedMeeting);
    return this.toMeetingPayload(updatedMeeting);
  }

  async cancelMeeting(user: User, meetingId: string) {
    const meeting = await this.getAuthorizedMeeting(user, meetingId);
    this.assertHostOrAdminParticipant(user, meeting);

    if ([MeetingState.CANCELLED, MeetingState.ENDED].includes(meeting.state)) {
      return this.toMeetingPayload(meeting);
    }

    meeting.state = MeetingState.CANCELLED;
    meeting.endedAt = new Date();
    await this.meetingsRepository.save(meeting);
    await this.notificationsService.createForUserIds(
      this.getParticipantIds(meeting).filter((participantId) => participantId !== user.id),
      {
        type: NotificationType.SYSTEM,
        severity: NotificationSeverity.WARNING,
        title: 'Meeting cancelled',
        body: `"${meeting.title}" has been cancelled.`,
        metadata: { meetingId: meeting.id },
        dedupeKey: `meeting:${meeting.id}:cancelled`,
      },
      { skipExistingUnresolved: false },
    );
    const updatedMeeting = await this.getMeetingEntityOrThrow(meetingId);
    this.emitMeetingUpdated(updatedMeeting);
    return this.toMeetingPayload(updatedMeeting);
  }

  async relaySignal(user: User, dto: MeetingSignalDto) {
    const meeting = await this.getAuthorizedMeeting(user, dto.meetingId);

    if (meeting.state !== MeetingState.LIVE) {
      throw new BadRequestException('Meeting signaling is only available live.');
    }

    const participantIds = this.getParticipantIds(meeting).filter(
      (participantId) => participantId !== user.id,
    );
    const recipientIds = dto.targetUserId
      ? participantIds.filter((participantId) => participantId === dto.targetUserId)
      : participantIds;

    if (dto.targetUserId && !recipientIds.length) {
      throw new ForbiddenException('Signal target is not a meeting participant.');
    }

    this.emitter.emitToUsers(recipientIds, RealtimeServerEvent.MEETING_SIGNAL, {
      meetingId: meeting.id,
      fromUserId: user.id,
      targetUserId: dto.targetUserId ?? null,
      type: dto.type,
      payload: dto.payload,
      clientRequestId: dto.clientRequestId ?? null,
      occurredAt: new Date().toISOString(),
    });

    return { ok: true };
  }

  async listNotes(user: User, meetingId: string) {
    await this.getAuthorizedMeeting(user, meetingId);
    const notes = await this.notesRepository.find({
      where: { meetingId },
      relations: { author: true },
      order: { createdAt: 'ASC' },
    });
    return notes.map((note) => this.toNotePayload(note));
  }

  async createNote(user: User, meetingId: string, dto: CreateMeetingNoteDto) {
    const meeting = await this.getAuthorizedMeeting(user, meetingId);
    const note = await this.notesRepository.save(
      this.notesRepository.create({
        meetingId,
        authorId: user.id,
        content: dto.content.trim(),
      }),
    );
    const savedNote = await this.notesRepository.findOneOrFail({
      where: { id: note.id },
      relations: { author: true },
    });
    const payload = this.toNotePayload(savedNote);
    this.emitter.emitToUsers(
      this.getParticipantIds(meeting),
      RealtimeServerEvent.MEETING_NOTE_CREATED,
      payload,
    );
    return payload;
  }

  async updateNote(
    user: User,
    meetingId: string,
    noteId: string,
    dto: UpdateMeetingNoteDto,
  ) {
    const meeting = await this.getAuthorizedMeeting(user, meetingId);
    const note = await this.notesRepository.findOne({
      where: { id: noteId, meetingId },
      relations: { author: true },
    });

    if (!note) {
      throw new NotFoundException('Meeting note not found.');
    }

    const canEdit =
      note.authorId === user.id ||
      user.role === UserRole.ADMIN ||
      meeting.hostId === user.id;

    if (!canEdit) {
      throw new ForbiddenException('You cannot edit this meeting note.');
    }

    note.content = dto.content.trim();
    const savedNote = await this.notesRepository.save(note);
    const payload = this.toNotePayload(savedNote);
    this.emitter.emitToUsers(
      this.getParticipantIds(meeting),
      RealtimeServerEvent.MEETING_NOTE_UPDATED,
      payload,
    );
    return payload;
  }

  async createRecording(
    user: User,
    meetingId: string,
    dto: CreateRecordingDto,
    file?: UploadedRecordingFile | null,
  ) {
    const meeting = await this.getAuthorizedMeeting(user, meetingId);

    if (meeting.state === MeetingState.CANCELLED) {
      throw new BadRequestException('Cannot record a cancelled meeting.');
    }

    const startedAt = new Date(dto.startedAt);
    const endedAt = new Date(dto.endedAt);

    if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
      throw new BadRequestException('Invalid recording timestamps.');
    }

    if (endedAt < startedAt) {
      throw new BadRequestException('Recording end time cannot precede start time.');
    }

    const recordingPath = await this.recordingStorage.saveRecording(
      `meetings/${meeting.id}`,
      file,
    );
    const recording = await this.recordingsRepository.save(
      this.recordingsRepository.create({
        meetingId,
        createdById: user.id,
        recordingPath,
        mimeType: dto.mimeType ?? file?.mimetype ?? null,
        sizeBytes: file?.size ?? file?.buffer?.length ?? 0,
        startedAt,
        endedAt,
        durationSeconds: dto.durationSeconds,
      }),
    );

    const payload = this.toRecordingPayload(recording);
    this.emitter.emitToUsers(
      this.getParticipantIds(meeting),
      RealtimeServerEvent.MEETING_RECORDING_CREATED,
      payload,
    );
    return payload;
  }

  async listRecordings(user: User, meetingId: string) {
    await this.getAuthorizedMeeting(user, meetingId);
    const recordings = await this.recordingsRepository.find({
      where: { meetingId },
      order: { createdAt: 'DESC' },
    });
    return recordings.map((recording) => this.toRecordingPayload(recording));
  }

  async getRecordingForDownload(user: User, recordingId: string) {
    const recording = await this.recordingsRepository.findOne({
      where: { id: recordingId },
      relations: {
        meeting: {
          host: true,
          participants: {
            user: true,
          },
        },
      },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found.');
    }

    this.assertStaff(user);
    this.assertMeetingParticipant(recording.meeting, user.id);

    if (!recording.recordingPath) {
      throw new NotFoundException('Recording file not available.');
    }

    await this.recordingStorage.assertExists(recording.recordingPath);
    return recording;
  }

  async createCaption(
    user: User,
    meetingId: string,
    dto: CreateCaptionSegmentDto,
  ) {
    const meeting = await this.getAuthorizedMeeting(user, meetingId);

    if (meeting.state !== MeetingState.LIVE) {
      throw new BadRequestException('Captions are only available during live meetings.');
    }

    const text = dto.text.trim();
    const translation = await this.translationService.translate({
      text,
      sourceLanguage: dto.sourceLanguage ?? null,
      targetLanguage: dto.targetLanguage ?? null,
    });
    const segment = await this.transcriptsRepository.save(
      this.transcriptsRepository.create({
        sessionType: TranscriptSessionType.MEETING,
        sessionId: meetingId,
        authorId: user.id,
        text,
        sourceLanguage: dto.sourceLanguage ?? null,
        targetLanguage: dto.targetLanguage ?? null,
        translatedText: translation.translatedText,
        translationStatus: this.toTranslationStatus(translation.status),
        translationProvider: translation.provider,
      }),
    );
    const payload = this.toTranscriptPayload(segment, user);
    this.emitter.emitToUsers(
      this.getParticipantIds(meeting),
      RealtimeServerEvent.CAPTION_SEGMENT_CREATED,
      payload,
    );
    return payload;
  }

  async listCaptions(user: User, meetingId: string) {
    await this.getAuthorizedMeeting(user, meetingId);
    const segments = await this.transcriptsRepository.find({
      where: {
        sessionType: TranscriptSessionType.MEETING,
        sessionId: meetingId,
      },
      relations: { author: true },
      order: { createdAt: 'ASC' },
      take: 300,
    });
    return segments.map((segment) =>
      this.toTranscriptPayload(segment, segment.author),
    );
  }

  private async dispatchMeetingInvitations(creator: User, meeting: Meeting) {
    const invitedParticipants = (meeting.participants ?? []).filter(
      (participant) => participant.userId !== creator.id,
    );

    if (!invitedParticipants.length) {
      return;
    }

    const scheduledTime = meeting.scheduledStartAt.toISOString();
    const frontendUrl = getRequiredString(this.configService, 'FRONTEND_URL');
    const link = `${frontendUrl.replace(/\/+$/, '')}/meetings/${meeting.id}`;
    const body = `You are invited to "${meeting.title}" at ${scheduledTime}. Join: ${link}`;
    const inviteeIds = invitedParticipants.map((participant) => participant.userId);

    await this.notificationsService.createForUserIds(
      inviteeIds,
      {
        type: NotificationType.SYSTEM,
        severity: NotificationSeverity.INFO,
        title: `Meeting invitation: ${meeting.title}`,
        body,
        metadata: {
          meetingId: meeting.id,
          scheduledStartAt: scheduledTime,
          joinPath: `/meetings/${meeting.id}`,
        },
        dedupeKey: `meeting:${meeting.id}:invite`,
      },
      { skipExistingUnresolved: false },
    );

    await Promise.all(
      inviteeIds.map((inviteeId) =>
        this.chatService
          .sendAutomatedDirectMessage(creator.id, inviteeId, body)
          .catch(() => {
            return null;
          }),
      ),
    );
  }

  private async getAuthorizedMeeting(user: User, meetingId: string) {
    this.assertStaff(user);
    const meeting = await this.getMeetingEntityOrThrow(meetingId);
    this.assertMeetingParticipant(meeting, user.id);
    return meeting;
  }

  private async getMeetingEntityOrThrow(meetingId: string) {
    const meeting = await this.meetingsRepository.findOne({
      where: { id: meetingId },
      relations: {
        host: true,
        participants: {
          user: true,
        },
      },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found.');
    }

    return meeting;
  }

  private assertStaff(user: User) {
    if (!this.isStaff(user)) {
      throw new ForbiddenException('Meetings are available to staff only.');
    }
  }

  private isStaff(user: User) {
    return user.role === UserRole.ADMIN || user.role === UserRole.EMPLOYEE;
  }

  private assertMeetingParticipant(meeting: Meeting, userId: string) {
    if (!this.getParticipantIds(meeting).includes(userId)) {
      throw new ForbiddenException('You are not invited to this meeting.');
    }
  }

  private assertHostOrAdminParticipant(user: User, meeting: Meeting) {
    this.assertMeetingParticipant(meeting, user.id);

    if (meeting.hostId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the host or an admin can do this.');
    }
  }

  private getParticipantIds(meeting: Meeting) {
    return (meeting.participants ?? []).map((participant) => participant.userId);
  }

  private assertCreationAllowed(userId: string) {
    const now = Date.now();
    const recentAttempts = (this.creationAttemptsByUserId.get(userId) ?? []).filter(
      (timestamp) => now - timestamp < MEETING_CREATION_WINDOW_MS,
    );

    if (recentAttempts.length >= MAX_MEETINGS_PER_WINDOW) {
      throw new BadRequestException('Too many meetings created. Please wait.');
    }

    recentAttempts.push(now);
    this.creationAttemptsByUserId.set(userId, recentAttempts);
  }

  private emitMeetingUpdated(meeting: Meeting) {
    this.emitter.emitToUsers(
      this.getParticipantIds(meeting),
      RealtimeServerEvent.MEETING_UPDATED,
      this.toMeetingPayload(meeting),
    );
  }

  private emitMeetingParticipantEvent(
    meeting: Meeting,
    user: User,
    action: 'joined' | 'left',
  ) {
    this.emitter.emitToUsers(
      this.getParticipantIds(meeting),
      RealtimeServerEvent.MEETING_PARTICIPANT_UPDATED,
      {
        meetingId: meeting.id,
        user: this.toUserSummary(user),
        action,
        occurredAt: new Date().toISOString(),
      },
    );
  }

  private toMeetingPayload(meeting: Meeting) {
    return {
      id: meeting.id,
      title: meeting.title,
      agenda: meeting.agenda,
      scheduledStartAt: meeting.scheduledStartAt.toISOString(),
      durationMinutes: meeting.durationMinutes,
      state: meeting.state,
      hostId: meeting.hostId,
      startedAt: meeting.startedAt?.toISOString() ?? null,
      endedAt: meeting.endedAt?.toISOString() ?? null,
      createdAt: meeting.createdAt.toISOString(),
      updatedAt: meeting.updatedAt.toISOString(),
      joinPath: `/meetings/${meeting.id}`,
      host: this.toUserSummary(meeting.host),
      participants: (meeting.participants ?? []).map((participant) => ({
        id: participant.id,
        meetingId: participant.meetingId,
        userId: participant.userId,
        role: participant.role,
        status: participant.status,
        joinedAt: participant.joinedAt?.toISOString() ?? null,
        leftAt: participant.leftAt?.toISOString() ?? null,
        user: this.toUserSummary(participant.user),
      })),
    };
  }

  private toNotePayload(note: MeetingNote) {
    return {
      id: note.id,
      meetingId: note.meetingId,
      authorId: note.authorId,
      author: this.toUserSummary(note.author),
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  private toRecordingPayload(recording: MeetingRecording) {
    return {
      id: recording.id,
      meetingId: recording.meetingId,
      createdById: recording.createdById,
      startedAt: recording.startedAt.toISOString(),
      endedAt: recording.endedAt.toISOString(),
      durationSeconds: recording.durationSeconds,
      mimeType: recording.mimeType,
      sizeBytes: recording.sizeBytes,
      hasFile: Boolean(recording.recordingPath),
      downloadUrl: recording.recordingPath
        ? `/api/meetings/recordings/${recording.id}/download`
        : null,
      createdAt: recording.createdAt.toISOString(),
    };
  }

  private toTranscriptPayload(segment: TranscriptSegment, author: User) {
    return {
      id: segment.id,
      sessionType: segment.sessionType,
      sessionId: segment.sessionId,
      authorId: segment.authorId,
      author: this.toUserSummary(author),
      text: segment.text,
      sourceLanguage: segment.sourceLanguage,
      targetLanguage: segment.targetLanguage,
      translatedText: segment.translatedText,
      translationStatus: segment.translationStatus,
      translationProvider: segment.translationProvider,
      createdAt: segment.createdAt.toISOString(),
    };
  }

  private toTranslationStatus(status: 'translated' | 'disabled' | 'failed') {
    if (status === 'translated') {
      return TranslationStatus.TRANSLATED;
    }

    if (status === 'failed') {
      return TranslationStatus.FAILED;
    }

    return TranslationStatus.DISABLED;
  }

  private toUserSummary(user: User): RealtimeUserSummary {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: this.getDisplayName(user),
      role: user.role,
    };
  }

  private getDisplayName(user: User) {
    return `${user.firstName} ${user.lastName}`.trim() || user.email;
  }
}
