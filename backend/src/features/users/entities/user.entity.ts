import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
  CUSTOMER = 'customer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  // Primary contact email, unique across users
  email: string;

  @Column({ type: 'varchar', nullable: true })
  // Hashed password; nullable when user registered via social providers
  password: string | null;

  @Column({ type: 'varchar', default: '' })
  // Given name
  firstName: string;

  @Column({ type: 'varchar', default: '' })
  // Family name
  lastName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;

  @Column({ type: 'boolean', default: false })
  // Whether the user's email address has been verified
  isEmailVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  totpSecret: string | null;

  @Column({ type: 'boolean', default: false })
  isTotpEnabled: boolean;

  @Column({ type: 'varchar', nullable: true })
  refreshToken: string | null;

  @Column({ type: 'varchar', nullable: true })
  passwordResetToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetExpires: Date | null;

  @Column({ type: 'varchar', nullable: true })
  googleId: string | null;

  @Column({ type: 'varchar', nullable: true })
  facebookId: string | null;

  @Column({ type: 'varchar', nullable: true })
  instagramId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}