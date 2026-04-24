import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CallSession } from './call-session.entity';

@Entity('call_recordings')
@Index(['callId', 'createdAt'])
export class CallRecording {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  callId!: string;

  @ManyToOne(() => CallSession, (call) => call.recordings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'callId' })
  call!: CallSession;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ type: 'varchar', length: 500, nullable: true })
  recordingPath!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  mimeType!: string | null;

  @Column({ type: 'integer', default: 0 })
  sizeBytes!: number;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'timestamptz' })
  endedAt!: Date;

  @Column({ type: 'integer', default: 0 })
  durationSeconds!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
