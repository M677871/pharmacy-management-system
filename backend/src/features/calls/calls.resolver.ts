import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCaptionSegmentDto } from '../media/dto/create-caption-segment.dto';
import { CreateRecordingDto } from '../media/dto/create-recording.dto';
import { User } from '../users/entities/user.entity';
import { CallsService } from './calls.service';
import { StartCallDto } from './dto/start-call.dto';

@Resolver()
@UseGuards(JwtAuthGuard)
export class CallsResolver {
  constructor(private readonly callsService: CallsService) {}

  @Query(() => GraphQLJSON, { name: 'calls' })
  listMine(
    @CurrentUser() user: User,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    return this.callsService.listMine(user, Number(limit ?? 50));
  }

  @Query(() => GraphQLJSON, { name: 'call' })
  getMine(
    @CurrentUser() user: User,
    @Args('callId', { type: () => ID }, ParseUUIDPipe) callId: string,
  ) {
    return this.callsService.getMine(user, callId);
  }

  @Query(() => GraphQLJSON, { name: 'callRecordings' })
  listRecordings(
    @CurrentUser() user: User,
    @Args('callId', { type: () => ID }, ParseUUIDPipe) callId: string,
  ) {
    return this.callsService.listRecordings(user, callId);
  }

  @Query(() => GraphQLJSON, { name: 'callCaptions' })
  listCaptions(
    @CurrentUser() user: User,
    @Args('callId', { type: () => ID }, ParseUUIDPipe) callId: string,
  ) {
    return this.callsService.listCaptions(user, callId);
  }

  @Mutation(() => GraphQLJSON, { name: 'startCall' })
  async startCall(
    @CurrentUser() user: User,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(StartCallDto, input);
    return this.callsService.startCall(user, dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'acceptCall' })
  acceptCall(
    @CurrentUser() user: User,
    @Args('callId', { type: () => ID }, ParseUUIDPipe) callId: string,
  ) {
    return this.callsService.acceptCall(user, callId);
  }

  @Mutation(() => GraphQLJSON, { name: 'rejectCall' })
  rejectCall(
    @CurrentUser() user: User,
    @Args('callId', { type: () => ID }, ParseUUIDPipe) callId: string,
  ) {
    return this.callsService.rejectCall(user, callId);
  }

  @Mutation(() => GraphQLJSON, { name: 'endCall' })
  endCall(
    @CurrentUser() user: User,
    @Args('callId', { type: () => ID }, ParseUUIDPipe) callId: string,
  ) {
    return this.callsService.endCall(user, callId);
  }

  @Mutation(() => GraphQLJSON, { name: 'failCall' })
  failCall(
    @CurrentUser() user: User,
    @Args('callId', { type: () => ID }, ParseUUIDPipe) callId: string,
  ) {
    return this.callsService.failCall(user, callId);
  }

  @Mutation(() => GraphQLJSON, { name: 'createCallRecording' })
  async createRecording(
    @CurrentUser() user: User,
    @Args('callId', { type: () => ID }, ParseUUIDPipe) callId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateRecordingDto, getRecordingDtoInput(input));
    const file = getRecordingFileInput(input);
    return this.callsService.createRecording(user, callId, dto, file);
  }

  @Mutation(() => GraphQLJSON, { name: 'createCallCaption' })
  async createCaption(
    @CurrentUser() user: User,
    @Args('callId', { type: () => ID }, ParseUUIDPipe) callId: string,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(CreateCaptionSegmentDto, input);
    return this.callsService.createCaption(user, callId, dto);
  }
}
