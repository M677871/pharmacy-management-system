import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { getRequiredString } from '../../config/env';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { PasswordResetService } from './password-reset/password-reset.service';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordResetService: PasswordResetService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ── Email / Password ────────────────────────────────────────────────

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) return null;
    const valid = await bcrypt.compare(password, user.password);
    return valid ? user : null;
  }

  async register(dto: RegisterDto) {
    const user = await this.usersService.createPublicUser(dto);
    const tokens = await this.generateTokens(user);
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(user: User) {
    if (user.isTotpEnabled) {
      const tempToken = this.jwtService.sign(
        { sub: user.id, requiresTwoFactor: true },
        {
          secret: getRequiredString(this.configService, 'JWT_ACCESS_SECRET'),
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
        secret: getRequiredString(this.configService, 'JWT_REFRESH_SECRET'),
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
    return this.passwordResetService.forgotPassword(email);
  }

  async resetPassword(dto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(dto);
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
        secret: getRequiredString(this.configService, 'JWT_ACCESS_SECRET'),
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
        secret: getRequiredString(this.configService, 'JWT_ACCESS_SECRET'),
        expiresIn: getRequiredString(this.configService, 'JWT_ACCESS_EXPIRATION'),
      }),
      this.jwtService.signAsync(payload, {
        secret: getRequiredString(this.configService, 'JWT_REFRESH_SECRET'),
        expiresIn: getRequiredString(this.configService, 'JWT_REFRESH_EXPIRATION'),
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
      passwordResetMethod,
      passwordResetAttempts,
      ...safe
    } = user;
    return safe;
  }
}
