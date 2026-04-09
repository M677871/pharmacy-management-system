import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';

@Entity('broadcast_messages')
@Index(['createdAt'])
export class BroadcastMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'varchar', length: 3000 })
  body: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    array: true,
  })
  audienceRoles: UserRole[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
