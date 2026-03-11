import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ── Email / Password ────────────────────────────────────────────────

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) return null;
    const valid = await bcrypt.compare(password, user.password);
    return valid ? user : null;
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const user = await this.usersService.create(dto);
    const tokens = await this.generateTokens(user);
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(user: User) {
    if (user.isTotpEnabled) {
      const tempToken = this.jwtService.sign(
        { sub: user.id, requiresTwoFactor: true },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: '5m',
        },
      );
      return { requiresTwoFactor: true, tempToken };
    }

    const tokens = await this.generateTokens(user);
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ── Refresh Tokens ──────────────────────────────────────────────────

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshToken) throw new UnauthorizedException();

    const valid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!valid) throw new UnauthorizedException();

    const tokens = await this.generateTokens(user);
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  decodeRefreshToken(token: string): { sub: string; email: string } {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.usersService.setRefreshToken(userId, null);
    return { message: 'Logged out' };
  }

  // ── Forgot / Reset Password ─────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal whether email exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    await this.usersService.update(user.id, {
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + 3_600_000), // 1 hour
    });

    // In production, send this token via email.
    // For development / testing, it is returned in the response.
    return {
      message: 'If the email exists, a reset link has been sent',
      resetToken: token, // DEV ONLY — remove in production
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.usersService.findByResetToken(hashedToken);

    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.usersService.update(user.id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    return { message: 'Password reset successful' };
  }

  // ── TOTP 2FA ────────────────────────────────────────────────────────

  async generateTotpSecret(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    const secret = authenticator.generateSecret();
    await this.usersService.update(userId, { totpSecret: secret });

    const otpauthUrl = authenticator.keyuri(user.email, 'Pharmacy', secret);
    const qrCode = await QRCode.toDataURL(otpauthUrl);
    return { secret, qrCode };
  }

  async enableTotp(userId: string, code: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.totpSecret)
      throw new BadRequestException('TOTP not set up');

    const valid = authenticator.verify({
      token: code,
      secret: user.totpSecret,
    });
    if (!valid) throw new BadRequestException('Invalid TOTP code');

    await this.usersService.update(userId, { isTotpEnabled: true });
    return { message: 'Two-factor authentication enabled' };
  }

  async verifyTotpAndLogin(tempToken: string, code: string) {
    let payload: { sub: string; requiresTwoFactor?: boolean };
    try {
      payload = this.jwtService.verify(tempToken, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!payload.requiresTwoFactor)
      throw new BadRequestException('Token is not a 2FA token');

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.totpSecret) throw new UnauthorizedException();

    const valid = authenticator.verify({
      token: code,
      secret: user.totpSecret,
    });
    if (!valid) throw new UnauthorizedException('Invalid TOTP code');

    const tokens = await this.generateTokens(user);
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async disableTotp(userId: string) {
    await this.usersService.update(userId, {
      isTotpEnabled: false,
      totpSecret: null,
    });
    return { message: 'Two-factor authentication disabled' };
  }

  // ── Social Login ────────────────────────────────────────────────────

  async handleSocialLogin(profile: {
    googleId?: string;
    facebookId?: string;
    instagramId?: string;
    email?: string | null;
    firstName?: string;
    lastName?: string;
  }) {
    let user: User | null = null;

    // Try to find by provider ID
    if (profile.googleId) {
      user = await this.usersService.findByGoogleId(profile.googleId);
    } else if (profile.facebookId) {
      user = await this.usersService.findByFacebookId(profile.facebookId);
    } else if (profile.instagramId) {
      user = await this.usersService.findByInstagramId(profile.instagramId);
    }

    // Try to link by email
    if (!user && profile.email) {
      user = await this.usersService.findByEmail(profile.email);
      if (user) {
        const linkData: Partial<User> = {};
        if (profile.googleId) linkData.googleId = profile.googleId;
        if (profile.facebookId) linkData.facebookId = profile.facebookId;
        if (profile.instagramId) linkData.instagramId = profile.instagramId;
        await this.usersService.update(user.id, linkData);
        user = (await this.usersService.findById(user.id))!;
      }
    }

    // Create new user
    if (!user) {
      user = await this.usersService.createSocialUser({
        email:
          profile.email ||
          `${profile.googleId || profile.facebookId || profile.instagramId}@social.placeholder`,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        isEmailVerified: !!profile.email,
        googleId: profile.googleId || null,
        facebookId: profile.facebookId || null,
        instagramId: profile.instagramId || null,
      });
    }

    const tokens = await this.generateTokens(user);
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User) {
    const {
      password,
      refreshToken,
      totpSecret,
      passwordResetToken,
      passwordResetExpires,
      ...safe
    } = user;
    return safe;
  }
}
