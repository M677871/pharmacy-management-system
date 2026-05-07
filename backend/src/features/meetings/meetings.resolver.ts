import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import {
  getRecordingDtoInput,
  getRecordingFileInput,
} from '../../common/graphql/recording-upload.util';
import {
  JsonObject,
  toValidatedDto,
} from '../../common/graphql/graphql-dto.util';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateCaptionSegmentDto } from '../media/dto/create-caption-segment.dto';
import { CreateRecordingDto } from '../media/dto/create-recording.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { CreateMeetingNoteDto } from './dto/create-meeting-note.dto';
import { UpdateMeetingNoteDto } from './dto/update-meeting-note.dto';
import { MeetingsService } from './meetings.service';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class MeetingsResolver {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Query(() => GraphQLJSON, { name: 'eligibleMeetingParticipants' })
  listEligibleParticipants(
    @CurrentUser() user: User,
    @Args('search', { nullable: true }) search?: string,
  ) {
    return this.meetingsService.listEligibleParticipants(user, search);
  }

  @Query(() => GraphQLJSON, { name: 'meetings' })
  listMine(@CurrentUser() user: User) {
    return this.meetingsService.listMine(user);
  }

  @Query(() => GraphQLJSON, { name: 'meeting' })
  getMeeting(
    @CurrentUser() user: User,
    @Args('meetingId', { type: () => ID }, ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingsService.getMeeting(user, meetingId);
  }

  @Query(() => GraphQLJSON, { name: 'meetingNotes' })
  listNotes(
    @CurrentUser() user: User,
    @Args('meetingId', { type: () => ID }, ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingsService.listNotes(user, meetingId);
  }

  @Query(() => GraphQLJSON, { name: 'meetingRecordings' })
  listRecordings(
    @CurrentUser() user: User,
    @Args('meetingId', { type: () => ID }, ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingsService.listRecordings(user, meetingId);
  }

  @Query(() => GraphQLJSON, { name: 'meetingCaptions' })
  listCaptions(
    @CurrentUser() user: User,
    @Args('meetingId', { type: () => ID }, ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingsService.listCaptions(user, meetingId);
  }

  @Mutation(() => GraphQLJSON, { name: 'createMeeting' })
  async createMeeting(
    @CurrentUser() user: User,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateMeetingDto, input);
    return this.meetingsService.createMeeting(user, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'joinMeeting' })
  joinMeeting(
    @CurrentUser() user: User,
    @Args('meetingId', { type: () => ID }, ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingsService.joinMeeting(user, meetingId);
  }

  @Mutation(() => GraphQLJSON, { name: 'leaveMeeting' })
  leaveMeeting(
    @CurrentUser() user: User,
    @Args('meetingId', { type: () => ID }, ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingsService.leaveMeeting(user, meetingId);
  }

  @Mutation(() => GraphQLJSON, { name: 'endMeeting' })
  endMeeting(
    @CurrentUser() user: User,
    @Args('meetingId', { type: () => ID }, ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingsService.endMeeting(user, meetingId);
  }

  @Mutation(() => GraphQLJSON, { name: 'cancelMeeting' })
  cancelMeeting(
    @CurrentUser() user: User,
    @Args('meetingId', { type: () => ID }, ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingsService.cancelMeeting(user, meetingId);
  }

  @Mutation(() => GraphQLJSON, { name: 'createMeetingNote' })
  async createNote(
    @CurrentUser() user: User,
    @Args('meetingId', { type: () => ID }, ParseUUIDPipe) meetingId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateMeetingNoteDto, input);
    return this.meetingsService.createNote(user, meetingId, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateMeetingNote' })
  async updateNote(
    @CurrentUser() user: User,
    @Args('meetingId', { type: () => ID }, ParseUUIDPipe) meetingId: string,
    @Args('noteId', { type: () => ID }, ParseUUIDPipe) noteId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(UpdateMeetingNoteDto, input);
    return this.meetingsService.updateNote(user, meetingId, noteId, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'createMeetingRecording' })
  async createRecording(
    @CurrentUser() user: User,
    @Args('meetingId', { type: () => ID }, ParseUUIDPipe) meetingId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateRecordingDto, getRecordingDtoInput(input));
    const file = getRecordingFileInput(input);
    return this.meetingsService.createRecording(user, meetingId, dto, file);
  }

  @Mutation(() => GraphQLJSON, { name: 'createMeetingCaption' })
  async createCaption(
    @CurrentUser() user: User,
    @Args('meetingId', { type: () => ID }, ParseUUIDPipe) meetingId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateCaptionSegmentDto, input);
    return this.meetingsService.createCaption(user, meetingId, dto);
  }
}
