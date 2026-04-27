import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Meeting } from './meeting.entity';

export enum MeetingParticipantRole {
  HOST = 'host',
  INVITEE = 'invitee',
}

export enum MeetingParticipantStatus {
  INVITED = 'invited',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  JOINED = 'joined',
  LEFT = 'left',
}

@Entity('meeting_participants')
@Index(['meetingId', 'userId'], { unique: true })
export class MeetingParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  meetingId!: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meetingId' })
  meeting!: Meeting;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({
    type: 'enum',
    enum: MeetingParticipantRole,
    enumName: 'meeting_participants_role_enum',
  })
  role!: MeetingParticipantRole;

  @Column({
    type: 'enum',
    enum: MeetingParticipantStatus,
    enumName: 'meeting_participants_status_enum',
    default: MeetingParticipantStatus.INVITED,
  })
  status!: MeetingParticipantStatus;

  @Column({ type: 'uuid' })
  invitedById!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitedById' })
  invitedBy!: User;

  @Column({ type: 'timestamptz', nullable: true })
  joinedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  leftAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
