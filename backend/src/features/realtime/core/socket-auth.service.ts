import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getRequiredString } from '../../../config/env';
import { User } from '../../users/entities/user.entity';

interface SocketHandshakeLike {
  auth?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  query?: Record<string, unknown>;
}

@Injectable()
export class SocketAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async authenticate(handshake: SocketHandshakeLike) {
    const token = this.extractToken(handshake);

    if (!token) {
      throw new UnauthorizedException('Missing socket access token.');
    }

    const payload = await this.jwtService
      .verifyAsync<{ sub: string }>(token, {
        secret: getRequiredString(this.configService, 'JWT_ACCESS_SECRET'),
      })
      .catch(() => {
        throw new UnauthorizedException('Invalid socket access token.');
      });

    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Socket user no longer exists.');
    }

    return user;
  }

  private extractToken(handshake: SocketHandshakeLike) {
    const candidates = [
      handshake.auth?.token,
      handshake.auth?.accessToken,
      handshake.headers?.authorization,
      handshake.query?.token,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== 'string' || !candidate.trim()) {
        continue;
      }

      if (candidate.startsWith('Bearer ')) {
        return candidate.slice(7).trim();
      }

      return candidate.trim();
    }

    return null;
  }
}
