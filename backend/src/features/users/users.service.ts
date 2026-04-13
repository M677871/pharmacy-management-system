import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RealtimeEmitterService } from '../realtime/core/realtime-emitter.service';
import { RealtimeServerEvent } from '../realtime/realtime.events';
import {
  AnalyticsRefreshPayload,
  UsersChangedPayload,
} from '../realtime/realtime.types';
import { PasswordResetMethod, User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { RegisterDto } from '../auth/dto/register.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly realtimeEmitter: RealtimeEmitterService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    await this.ensureEmailAvailable(dto.email);
    const email = dto.email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepository.create({
      ...dto,
      email,
      password: hashedPassword,
    });
    const savedUser = await this.usersRepository.save(user);
    this.emitUserCreated(savedUser);
    return savedUser;
  }

  async createPublicUser(dto: RegisterDto): Promise<User> {
    await this.ensureEmailAvailable(dto.email);
    const email = dto.email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      firstName: dto.firstName?.trim() ?? '',
      lastName: dto.lastName?.trim() ?? '',
      role: UserRole.CUSTOMER,
    });
    const savedUser = await this.usersRepository.save(user);
    this.emitUserCreated(savedUser);
    return savedUser;
  }

  async createSocialUser(data: Partial<User>): Promise<User> {
    if (!data.email) {
      throw new ConflictException('A social account email is required');
    }

    await this.ensureEmailAvailable(data.email);
    const user = this.usersRepository.create({
      ...data,
      email: data.email?.trim().toLowerCase(),
      role: data.role ?? UserRole.CUSTOMER,
    });
    const savedUser = await this.usersRepository.save(user);
    this.emitUserCreated(savedUser);
    return savedUser;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { googleId } });
  }

  async findByFacebookId(facebookId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { facebookId } });
  }

  async findByInstagramId(instagramId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { instagramId } });
  }

  async findByResetToken(
    hashedToken: string,
    method?: PasswordResetMethod,
  ): Promise<User | null> {
    const query = this.usersRepository
      .createQueryBuilder('user')
      .where('user.passwordResetToken = :hashedToken', { hashedToken });

    if (method) {
      query.andWhere('user.passwordResetMethod = :method', { method });
    }

    return query.getOne();
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, data);
    return this.findById(id) as Promise<User>;
  }

  async setRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    // Store a hashed refresh token; null clears the stored token
    const hashed = refreshToken ? await bcrypt.hash(refreshToken, 12) : null;
    await this.usersRepository.update(userId, { refreshToken: hashed });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: [
        'id', 'email', 'firstName', 'lastName', 'role',
        'isEmailVerified', 'isTotpEnabled', 'createdAt', 'updatedAt',
      ],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  sanitizeUser(user: User) {
    const {
      password,
      refreshToken,
      totpSecret,
      passwordResetToken,
      passwordResetExpires,
      passwordResetMethod,
      passwordResetAttempts,
      ...safe
    } = user;

    return safe;
  }

  private async ensureEmailAvailable(email: string) {
    const existing = await this.findByEmail(email);

    if (existing) {
      throw new ConflictException('Email already registered');
    }
  }

  private emitUserCreated(user: User) {
    const occurredAt = new Date().toISOString();
    const usersPayload: UsersChangedPayload = {
      reason: 'user.created',
      userId: user.id,
      occurredAt,
    };
    const analyticsPayload: AnalyticsRefreshPayload = {
      scope: 'users',
      reason: 'user.created',
      occurredAt,
    };

    this.realtimeEmitter.emitToRoles(
      [UserRole.ADMIN, UserRole.EMPLOYEE],
      RealtimeServerEvent.USERS_CHANGED,
      usersPayload,
    );
    this.realtimeEmitter.emitToRoles(
      [UserRole.ADMIN, UserRole.EMPLOYEE],
      RealtimeServerEvent.ANALYTICS_REFRESH,
      analyticsPayload,
    );
  }
}
