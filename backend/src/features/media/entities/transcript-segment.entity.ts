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

export enum TranscriptSessionType {
  CALL = 'call',
  MEETING = 'meeting',
}

export enum TranslationStatus {
  NOT_REQUESTED = 'not_requested',
  TRANSLATED = 'translated',
  DISABLED = 'disabled',
  FAILED = 'failed',
}

@Entity('transcript_segments')
@Index(['sessionType', 'sessionId', 'createdAt'])
export class TranscriptSegment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: TranscriptSessionType,
    enumName: 'transcript_segments_sessionType_enum',
  })
  sessionType!: TranscriptSessionType;

  @Column({ type: 'uuid' })
  sessionId!: string;

  @Column({ type: 'uuid' })
  authorId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author!: User;

  @Column({ type: 'varchar', length: 400 })
  text!: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  sourceLanguage!: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  targetLanguage!: string | null;

  @Column({ type: 'varchar', length: 400, nullable: true })
  translatedText!: string | null;

  @Column({
    type: 'enum',
    enum: TranslationStatus,
    enumName: 'transcript_segments_translationStatus_enum',
    default: TranslationStatus.NOT_REQUESTED,
  })
  translationStatus!: TranslationStatus;

  @Column({ type: 'varchar', length: 80, nullable: true })
  translationProvider!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
