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
import { CallSession } from './call-session.entity';

export enum CallParticipantRole {
  CALLER = 'caller',
  RECEIVER = 'receiver',
}

@Entity('call_participants')
@Index(['callId', 'userId'], { unique: true })
export class CallParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  callId!: string;

  @ManyToOne(() => CallSession, (call) => call.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'callId' })
  call!: CallSession;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({
    type: 'enum',
    enum: CallParticipantRole,
    enumName: 'call_participants_role_enum',
  })
  role!: CallParticipantRole;

  @Column({ type: 'timestamptz', nullable: true })
  joinedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  leftAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  microphoneMuted!: boolean;

  @Column({ type: 'boolean', default: true })
  cameraEnabled!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
