import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    // Intentionally minimal log to assist local debugging during tests
    console.debug('[UsersService] create() called for', dto.email);
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepository.create({
      ...dto,
      password: hashedPassword,
    });
    return this.usersRepository.save(user);
  }

  async createSocialUser(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
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

  async findByResetToken(hashedToken: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { passwordResetToken: hashedToken },
    });
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
    });
  }
}
