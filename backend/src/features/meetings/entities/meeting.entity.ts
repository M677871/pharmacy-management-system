import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MeetingNote } from './meeting-note.entity';
import { MeetingParticipant } from './meeting-participant.entity';
import { MeetingRecording } from './meeting-recording.entity';

export enum MeetingState {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

@Entity('meetings')
@Index(['scheduledStartAt'])
@Index(['hostId', 'createdAt'])
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'varchar', length: 4000, nullable: true })
  agenda!: string | null;

  @Column({ type: 'timestamptz' })
  scheduledStartAt!: Date;

  @Column({ type: 'integer' })
  durationMinutes!: number;

  @Column({
    type: 'enum',
    enum: MeetingState,
    enumName: 'meetings_state_enum',
    default: MeetingState.SCHEDULED,
  })
  state!: MeetingState;

  @Column({ type: 'uuid' })
  hostId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostId' })
  host!: User;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @OneToMany(() => MeetingParticipant, (participant) => participant.meeting)
  participants!: MeetingParticipant[];

  @OneToMany(() => MeetingNote, (note) => note.meeting)
  notes!: MeetingNote[];

  @OneToMany(() => MeetingRecording, (recording) => recording.meeting)
  recordings!: MeetingRecording[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
