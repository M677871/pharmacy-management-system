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
import { CallParticipant } from './call-participant.entity';
import { CallRecording } from './call-recording.entity';

export enum CallType {
  VOICE = 'voice',
  VIDEO = 'video',
}

export enum CallStatus {
  RINGING = 'ringing',
  CONNECTING = 'connecting',
  ACTIVE = 'active',
  ENDED = 'ended',
  MISSED = 'missed',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

@Entity('call_sessions')
@Index(['callerId', 'createdAt'])
@Index(['receiverId', 'createdAt'])
export class CallSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: CallType, enumName: 'call_sessions_type_enum' })
  type!: CallType;

  @Column({
    type: 'enum',
    enum: CallStatus,
    enumName: 'call_sessions_status_enum',
    default: CallStatus.RINGING,
  })
  status!: CallStatus;

  @Column({ type: 'uuid' })
  callerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'callerId' })
  caller!: User;

  @Column({ type: 'uuid' })
  receiverId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiverId' })
  receiver!: User;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @Column({ type: 'integer', default: 0 })
  durationSeconds!: number;

  @Column({ type: 'varchar', length: 120, nullable: true })
  endedReason!: string | null;

  @OneToMany(() => CallParticipant, (participant) => participant.call)
  participants!: CallParticipant[];

  @OneToMany(() => CallRecording, (recording) => recording.call)
  recordings!: CallRecording[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
