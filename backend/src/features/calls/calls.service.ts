import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
import { CallSignalDto } from './dto/call-signal.dto';
import { StartCallDto } from './dto/start-call.dto';
import {
  CallSession,
  CallStatus,
  CallType,
} from './entities/call-session.entity';
import {
  CallParticipant,
  CallParticipantRole,
} from './entities/call-participant.entity';
import { CallRecording } from './entities/call-recording.entity';

type CallLifecycleReason = 'accepted' | 'rejected' | 'ended' | 'missed' | 'failed';

const CALL_TIMEOUT_MS = 45_000;
const CREATION_WINDOW_MS = 60_000;
const MAX_CALLS_PER_WINDOW = 8;

@Injectable()
export class CallsService implements OnModuleDestroy {
  private readonly missedTimers = new Map<string, NodeJS.Timeout>();
  private readonly creationAttemptsByUserId = new Map<string, number[]>();

  constructor(
    @InjectRepository(CallSession)
    private readonly callsRepository: Repository<CallSession>,
    @InjectRepository(CallParticipant)
    private readonly participantsRepository: Repository<CallParticipant>,
    @InjectRepository(CallRecording)
    private readonly recordingsRepository: Repository<CallRecording>,
    @InjectRepository(TranscriptSegment)
    private readonly transcriptsRepository: Repository<TranscriptSegment>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly emitter: RealtimeEmitterService,
    private readonly recordingStorage: RecordingStorageService,
    private readonly translationService: TranslationService,
  ) {}

  onModuleDestroy() {
    for (const timer of this.missedTimers.values()) {
      clearTimeout(timer);
    }
    this.missedTimers.clear();
  }

  async startCall(caller: User, dto: StartCallDto) {
    this.assertCreationAllowed(caller.id);

    if (caller.id === dto.recipientId) {
      throw new BadRequestException('You cannot call yourself.');
    }

    const recipient = await this.usersRepository.findOne({
      where: { id: dto.recipientId },
    });

    if (!recipient) {
      throw new NotFoundException('Call recipient not found.');
    }

    if (!this.isAllowedContactRole(caller.role, recipient.role)) {
      throw new ForbiddenException('You do not have access to call this user.');
    }

    const call = await this.callsRepository.save(
      this.callsRepository.create({
        type: dto.type,
        status: CallStatus.RINGING,
        callerId: caller.id,
        receiverId: recipient.id,
        startedAt: null,
        endedAt: null,
        durationSeconds: 0,
        endedReason: null,
      }),
    );

    await this.participantsRepository.save([
      this.participantsRepository.create({
        callId: call.id,
        userId: caller.id,
        role: CallParticipantRole.CALLER,
        joinedAt: new Date(),
        leftAt: null,
        microphoneMuted: false,
        cameraEnabled: dto.type === CallType.VIDEO,
      }),
      this.participantsRepository.create({
        callId: call.id,
        userId: recipient.id,
        role: CallParticipantRole.RECEIVER,
        joinedAt: null,
        leftAt: null,
        microphoneMuted: false,
        cameraEnabled: dto.type === CallType.VIDEO,
      }),
    ]);

    const hydratedCall = await this.getCallEntityOrThrow(call.id);
    const payload = this.toCallPayload(hydratedCall);
    this.emitter.emitToUser(
      recipient.id,
      RealtimeServerEvent.CALL_INCOMING,
      payload,
    );
    this.emitCallUpdated(hydratedCall);

    await this.notificationsService.createForUserIds(
      [recipient.id],
      {
        type: NotificationType.SYSTEM,
        severity: NotificationSeverity.INFO,
        title: `Incoming ${dto.type} call`,
        body: `${this.getDisplayName(caller)} is calling you.`,
        metadata: {
          callId: call.id,
          callerId: caller.id,
          callType: dto.type,
        },
        dedupeKey: `call:${call.id}:incoming`,
      },
      { skipExistingUnresolved: false },
    );

    this.scheduleMissedCall(call.id);
    return payload;
  }

  async listMine(user: User, limit = 50) {
    const calls = await this.callsRepository.find({
      where: [{ callerId: user.id }, { receiverId: user.id }],
      relations: {
        caller: true,
        receiver: true,
        participants: {
          user: true,
        },
      },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 100),
    });

    return calls.map((call) => this.toCallPayload(call));
  }

  async getMine(user: User, callId: string) {
    const call = await this.getCallEntityOrThrow(callId);
    this.assertParticipant(call, user.id);
    return this.toCallPayload(call);
  }

  async acceptCall(user: User, callId: string) {
    const call = await this.getCallEntityOrThrow(callId);
    this.assertParticipant(call, user.id);

    if (call.receiverId !== user.id) {
      throw new ForbiddenException('Only the receiver can accept this call.');
    }

    if (call.status !== CallStatus.RINGING) {
      throw new BadRequestException('This call is no longer ringing.');
    }

    call.status = CallStatus.ACTIVE;
    call.startedAt = new Date();
    call.endedReason = null;
    await this.callsRepository.save(call);
    await this.participantsRepository.update(
      { callId, userId: user.id },
      { joinedAt: call.startedAt, leftAt: null },
    );
    this.clearMissedTimer(call.id);
    await this.resolveCallNotifications(call, 'accepted');

    const updatedCall = await this.getCallEntityOrThrow(callId);
    this.emitCallUpdated(updatedCall);
    return this.toCallPayload(updatedCall);
  }

  async rejectCall(user: User, callId: string) {
    const call = await this.getCallEntityOrThrow(callId);
    this.assertParticipant(call, user.id);

    if (call.receiverId !== user.id) {
      throw new ForbiddenException('Only the receiver can reject this call.');
    }

    if (call.status !== CallStatus.RINGING) {
      throw new BadRequestException('This call is no longer ringing.');
    }

    await this.finishCall(call, CallStatus.REJECTED, 'rejected', user.id);
    return this.toCallPayload(await this.getCallEntityOrThrow(callId));
  }

  async endCall(user: User, callId: string) {
    const call = await this.getCallEntityOrThrow(callId);
    this.assertParticipant(call, user.id);

    if (
      [CallStatus.ENDED, CallStatus.MISSED, CallStatus.REJECTED, CallStatus.FAILED].includes(
        call.status,
      )
    ) {
      return this.toCallPayload(call);
    }

    const nextStatus =
      call.status === CallStatus.RINGING && user.id === call.callerId
        ? CallStatus.MISSED
        : CallStatus.ENDED;

    await this.finishCall(call, nextStatus, 'ended', user.id);
    return this.toCallPayload(await this.getCallEntityOrThrow(callId));
  }

  async failCall(user: User, callId: string) {
    const call = await this.getCallEntityOrThrow(callId);
    this.assertParticipant(call, user.id);

    if (
      [CallStatus.ENDED, CallStatus.MISSED, CallStatus.REJECTED, CallStatus.FAILED].includes(
        call.status,
      )
    ) {
      return this.toCallPayload(call);
    }

    await this.finishCall(call, CallStatus.FAILED, 'failed', user.id);
    return this.toCallPayload(await this.getCallEntityOrThrow(callId));
  }

  async relaySignal(user: User, dto: CallSignalDto) {
    const call = await this.getCallEntityOrThrow(dto.callId);
    this.assertParticipant(call, user.id);

    if (
      [CallStatus.ENDED, CallStatus.MISSED, CallStatus.REJECTED, CallStatus.FAILED].includes(
        call.status,
      )
    ) {
      throw new BadRequestException('Cannot signal on a finished call.');
    }

    const recipientIds = this.getParticipantIds(call).filter(
      (participantId) => participantId !== user.id,
    );

    this.emitter.emitToUsers(recipientIds, RealtimeServerEvent.CALL_SIGNAL, {
      callId: call.id,
      fromUserId: user.id,
      type: dto.type,
      payload: dto.payload,
      clientRequestId: dto.clientRequestId ?? null,
      occurredAt: new Date().toISOString(),
    });

    return { ok: true };
  }

  async createRecording(
    user: User,
    callId: string,
    dto: CreateRecordingDto,
    file?: UploadedRecordingFile | null,
  ) {
    const call = await this.getCallEntityOrThrow(callId);
    this.assertParticipant(call, user.id);

    const startedAt = new Date(dto.startedAt);
    const endedAt = new Date(dto.endedAt);

    if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
      throw new BadRequestException('Invalid recording timestamps.');
    }

    if (endedAt < startedAt) {
      throw new BadRequestException('Recording end time cannot precede start time.');
    }

    const recordingPath = await this.recordingStorage.saveRecording(
      `calls/${call.id}`,
      file,
    );
    const recording = await this.recordingsRepository.save(
      this.recordingsRepository.create({
        callId: call.id,
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
      this.getParticipantIds(call),
      RealtimeServerEvent.CALL_RECORDING_CREATED,
      payload,
    );
    return payload;
  }

  async listRecordings(user: User, callId: string) {
    const call = await this.getCallEntityOrThrow(callId);
    this.assertParticipant(call, user.id);
    const recordings = await this.recordingsRepository.find({
      where: { callId },
      order: { createdAt: 'DESC' },
    });
    return recordings.map((recording) => this.toRecordingPayload(recording));
  }

  async getRecordingForDownload(user: User, recordingId: string) {
    const recording = await this.recordingsRepository.findOne({
      where: { id: recordingId },
      relations: {
        call: {
          caller: true,
          receiver: true,
          participants: {
            user: true,
          },
        },
      },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found.');
    }

    this.assertParticipant(recording.call, user.id);

    if (!recording.recordingPath) {
      throw new NotFoundException('Recording file not available.');
    }

    await this.recordingStorage.assertExists(recording.recordingPath);
    return recording;
  }

  async createCaption(
    user: User,
    callId: string,
    dto: CreateCaptionSegmentDto,
  ) {
    const call = await this.getCallEntityOrThrow(callId);
    this.assertParticipant(call, user.id);

    if (![CallStatus.ACTIVE, CallStatus.CONNECTING].includes(call.status)) {
      throw new BadRequestException('Captions are only available during active calls.');
    }

    const text = dto.text.trim();
    const translation = await this.translationService.translate({
      text,
      sourceLanguage: dto.sourceLanguage ?? null,
      targetLanguage: dto.targetLanguage ?? null,
    });

    const segment = await this.transcriptsRepository.save(
      this.transcriptsRepository.create({
        sessionType: TranscriptSessionType.CALL,
        sessionId: call.id,
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
      this.getParticipantIds(call),
      RealtimeServerEvent.CAPTION_SEGMENT_CREATED,
      payload,
    );
    return payload;
  }

  async listCaptions(user: User, callId: string) {
    const call = await this.getCallEntityOrThrow(callId);
    this.assertParticipant(call, user.id);
    const segments = await this.transcriptsRepository.find({
      where: {
        sessionType: TranscriptSessionType.CALL,
        sessionId: callId,
      },
      relations: { author: true },
      order: { createdAt: 'ASC' },
      take: 200,
    });
    return segments.map((segment) =>
      this.toTranscriptPayload(segment, segment.author),
    );
  }

  private async finishCall(
    call: CallSession,
    status: CallStatus,
    reason: CallLifecycleReason,
    actorUserId: string,
  ) {
    const endedAt = new Date();
    call.status = status;
    call.endedAt = endedAt;
    call.durationSeconds = call.startedAt
      ? Math.max(0, Math.round((endedAt.getTime() - call.startedAt.getTime()) / 1000))
      : 0;
    call.endedReason = reason;
    await this.callsRepository.save(call);
    await this.participantsRepository.update(
      { callId: call.id, userId: actorUserId },
      { leftAt: endedAt },
    );
    this.clearMissedTimer(call.id);
    await this.resolveCallNotifications(call, reason);

    if (status === CallStatus.MISSED) {
      await this.notificationsService.createForUserIds(
        [call.receiverId],
        {
          type: NotificationType.SYSTEM,
          severity: NotificationSeverity.WARNING,
          title: 'Missed call',
          body: `You missed a ${call.type} call from ${this.getDisplayName(call.caller)}.`,
          metadata: {
            callId: call.id,
            callerId: call.callerId,
            callType: call.type,
          },
          dedupeKey: `call:${call.id}:missed`,
        },
        { skipExistingUnresolved: false },
      );
    }

    const updatedCall = await this.getCallEntityOrThrow(call.id);
    this.emitCallUpdated(updatedCall);
  }

  private scheduleMissedCall(callId: string) {
    this.clearMissedTimer(callId);
    const timer = setTimeout(() => {
      void this.markCallMissed(callId).catch(() => {
        return;
      });
    }, CALL_TIMEOUT_MS);
    this.missedTimers.set(callId, timer);
  }

  private clearMissedTimer(callId: string) {
    const timer = this.missedTimers.get(callId);

    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.missedTimers.delete(callId);
  }

  private async markCallMissed(callId: string) {
    const call = await this.getCallEntityOrThrow(callId);

    if (call.status !== CallStatus.RINGING) {
      return;
    }

    await this.finishCall(call, CallStatus.MISSED, 'missed', call.callerId);
  }

  private async getCallEntityOrThrow(callId: string) {
    const call = await this.callsRepository.findOne({
      where: { id: callId },
      relations: {
        caller: true,
        receiver: true,
        participants: {
          user: true,
        },
      },
    });

    if (!call) {
      throw new NotFoundException('Call not found.');
    }

    return call;
  }

  private assertParticipant(call: CallSession, userId: string) {
    if (!this.getParticipantIds(call).includes(userId)) {
      throw new ForbiddenException('You are not a participant in this call.');
    }
  }

  private getParticipantIds(call: CallSession) {
    if (call.participants?.length) {
      return call.participants.map((participant) => participant.userId);
    }

    return [call.callerId, call.receiverId];
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

  private assertCreationAllowed(userId: string) {
    const now = Date.now();
    const recentAttempts = (this.creationAttemptsByUserId.get(userId) ?? []).filter(
      (timestamp) => now - timestamp < CREATION_WINDOW_MS,
    );

    if (recentAttempts.length >= MAX_CALLS_PER_WINDOW) {
      throw new BadRequestException('Too many call attempts. Please wait.');
    }

    recentAttempts.push(now);
    this.creationAttemptsByUserId.set(userId, recentAttempts);
  }

  private async resolveCallNotifications(
    call: CallSession,
    reason: CallLifecycleReason,
  ) {
    await this.notificationsService.resolveByDedupeKeys(
      [call.receiverId],
      [`call:${call.id}:incoming`],
    );

    this.emitter.emitToUsers(
      this.getParticipantIds(call),
      RealtimeServerEvent.CALL_LIFECYCLE,
      {
        callId: call.id,
        status: call.status,
        reason,
        occurredAt: new Date().toISOString(),
      },
    );
  }

  private emitCallUpdated(call: CallSession) {
    this.emitter.emitToUsers(
      this.getParticipantIds(call),
      RealtimeServerEvent.CALL_UPDATED,
      this.toCallPayload(call),
    );
  }

  private toCallPayload(call: CallSession) {
    return {
      id: call.id,
      type: call.type,
      status: call.status,
      callerId: call.callerId,
      receiverId: call.receiverId,
      startedAt: call.startedAt?.toISOString() ?? null,
      endedAt: call.endedAt?.toISOString() ?? null,
      durationSeconds: call.durationSeconds,
      endedReason: call.endedReason,
      createdAt: call.createdAt.toISOString(),
      updatedAt: call.updatedAt.toISOString(),
      caller: this.toUserSummary(call.caller),
      receiver: this.toUserSummary(call.receiver),
      participants: (call.participants ?? []).map((participant) => ({
        id: participant.id,
        callId: participant.callId,
        userId: participant.userId,
        role: participant.role,
        joinedAt: participant.joinedAt?.toISOString() ?? null,
        leftAt: participant.leftAt?.toISOString() ?? null,
        microphoneMuted: participant.microphoneMuted,
        cameraEnabled: participant.cameraEnabled,
        user: this.toUserSummary(participant.user),
      })),
    };
  }

  private toRecordingPayload(recording: CallRecording) {
    return {
      id: recording.id,
      callId: recording.callId,
      createdById: recording.createdById,
      startedAt: recording.startedAt.toISOString(),
      endedAt: recording.endedAt.toISOString(),
      durationSeconds: recording.durationSeconds,
      mimeType: recording.mimeType,
      sizeBytes: recording.sizeBytes,
      hasFile: Boolean(recording.recordingPath),
      downloadUrl: recording.recordingPath
        ? `/api/calls/recordings/${recording.id}/download`
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
