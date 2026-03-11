import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { AuthService } from '../../src/features/auth/auth.service';
import { UsersService } from '../../src/features/users/users.service';
import { User, UserRole } from '../../src/features/users/entities/user.entity';

// Helper type for a fully mocked service
type MockService<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? jest.Mock : T[K];
};

/**
 * Unit tests for AuthService — fast, no database, fully mocked dependencies.
 */
describe('AuthService (unit)', () => {
  let authService: AuthService;
  let usersService: MockService<UsersService>;
  let jwtService: MockService<Pick<JwtService, 'sign' | 'signAsync' | 'verify'>>;
  let configService: { get: jest.Mock };

  const mockUser: User = {
    id: 'uuid-1',
    email: 'user@test.com',
    password: '', // set per test
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.CUSTOMER,
    isEmailVerified: false,
    totpSecret: null as any,
    isTotpEnabled: false,
    refreshToken: null as any,
    passwordResetToken: null as any,
    passwordResetExpires: null as any,
    googleId: null as any,
    facebookId: null as any,
    instagramId: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      createSocialUser: jest.fn(),
      update: jest.fn(),
      setRefreshToken: jest.fn(),
      findByGoogleId: jest.fn(),
      findByFacebookId: jest.fn(),
      findByInstagramId: jest.fn(),
      findByResetToken: jest.fn(),
      findAll: jest.fn(),
    } as any;

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string, fallback?: string) => {
        const map: Record<string, string> = {
          JWT_ACCESS_SECRET: 'test-access',
          JWT_REFRESH_SECRET: 'test-refresh',
          JWT_ACCESS_EXPIRATION: '15m',
          JWT_REFRESH_EXPIRATION: '7d',
        };
        return map[key] ?? fallback;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  // ── validateUser ────────────────────────────────────────────────────

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const hashed = await bcrypt.hash('Test1234!', 4);
      const user = { ...mockUser, password: hashed };
      usersService.findByEmail.mockResolvedValue(user);

      const result = await authService.validateUser('user@test.com', 'Test1234!');
      expect(result).toEqual(user);
    });

    it('should return null when password is wrong', async () => {
      const hashed = await bcrypt.hash('Test1234!', 4);
      const user = { ...mockUser, password: hashed };
      usersService.findByEmail.mockResolvedValue(user);

      const result = await authService.validateUser('user@test.com', 'wrong');
      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const result = await authService.validateUser('nobody@test.com', 'pw');
      expect(result).toBeNull();
    });

    it('should return null when user has no password (social-only)', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, password: null });
      const result = await authService.validateUser('user@test.com', 'pw');
      expect(result).toBeNull();
    });
  });

  // ── register ────────────────────────────────────────────────────────

  describe('register', () => {
    it('should create user and return tokens', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);
      usersService.setRefreshToken.mockResolvedValue(undefined);

      const result = await authService.register({
        email: 'new@test.com',
        password: 'Test1234!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).not.toHaveProperty('password');
      expect(usersService.create).toHaveBeenCalled();
    });

    it('should throw ConflictException for existing email', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.register({ email: 'user@test.com', password: 'Test1234!' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── login ───────────────────────────────────────────────────────────

  describe('login', () => {
    it('should return tokens for non-2FA user', async () => {
      usersService.setRefreshToken.mockResolvedValue(undefined);

      const result = await authService.login(mockUser);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should return tempToken when 2FA is enabled', async () => {
      const user2fa = { ...mockUser, isTotpEnabled: true, totpSecret: 'secret' };

      const result = await authService.login(user2fa);

      expect(result).toHaveProperty('requiresTwoFactor', true);
      expect(result).toHaveProperty('tempToken');
      expect(result).not.toHaveProperty('accessToken');
    });
  });

  // ── handleSocialLogin ──────────────────────────────────────────────

  describe('handleSocialLogin', () => {
    it('should find existing user by googleId', async () => {
      const googleUser = { ...mockUser, googleId: 'google-123' };
      usersService.findByGoogleId.mockResolvedValue(googleUser);
      usersService.setRefreshToken.mockResolvedValue(undefined);

      const result = await authService.handleSocialLogin({
        googleId: 'google-123',
        email: 'g@test.com',
        firstName: 'G',
        lastName: 'User',
      });

      expect(result).toHaveProperty('accessToken');
      expect(usersService.findByGoogleId).toHaveBeenCalledWith('google-123');
    });

    it('should link account by email if provider ID not found', async () => {
      usersService.findByFacebookId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.update.mockResolvedValue(mockUser);
      usersService.findById.mockResolvedValue({
        ...mockUser,
        facebookId: 'fb-123',
      });
      usersService.setRefreshToken.mockResolvedValue(undefined);

      const result = await authService.handleSocialLogin({
        facebookId: 'fb-123',
        email: 'user@test.com',
      });

      expect(result).toHaveProperty('accessToken');
      expect(usersService.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ facebookId: 'fb-123' }),
      );
    });

    it('should create new user when no match found', async () => {
      usersService.findByInstagramId.mockResolvedValue(null);
      const newUser = { ...mockUser, instagramId: 'ig-123' };
      usersService.createSocialUser.mockResolvedValue(newUser);
      usersService.setRefreshToken.mockResolvedValue(undefined);

      const result = await authService.handleSocialLogin({
        instagramId: 'ig-123',
        email: null,
        firstName: 'Insta',
      });

      expect(result).toHaveProperty('accessToken');
      expect(usersService.createSocialUser).toHaveBeenCalled();
    });
  });

  // ── forgotPassword / resetPassword ─────────────────────────────────

  describe('forgotPassword', () => {
    it('should return generic message for non-existent email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await authService.forgotPassword('nobody@test.com');
      expect(result.message).toBeDefined();
      expect(result).not.toHaveProperty('resetToken');
    });

    it('should return resetToken for existing user', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.update.mockResolvedValue(mockUser);

      const result = await authService.forgotPassword('user@test.com');
      expect(result.message).toBeDefined();
      expect(result.resetToken).toBeDefined();
    });
  });

  describe('resetPassword', () => {
    it('should throw for invalid token', async () => {
      usersService.findByResetToken.mockResolvedValue(null);

      await expect(
        authService.resetPassword('bad-token', 'NewPass1!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw for expired token', async () => {
      usersService.findByResetToken.mockResolvedValue({
        ...mockUser,
        passwordResetToken: 'hashed',
        passwordResetExpires: new Date(Date.now() - 10_000), // expired
      });

      await expect(
        authService.resetPassword('any-token', 'NewPass1!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reset password with valid token', async () => {
      usersService.findByResetToken.mockResolvedValue({
        ...mockUser,
        passwordResetToken: 'hashed',
        passwordResetExpires: new Date(Date.now() + 3_600_000), // valid
      });
      usersService.update.mockResolvedValue(mockUser);

      const result = await authService.resetPassword('valid-token', 'NewPass1!');
      expect(result.message).toMatch(/reset successful/i);
      expect(usersService.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          passwordResetToken: null,
          passwordResetExpires: null,
        }),
      );
    });
  });

  // ── TOTP ────────────────────────────────────────────────────────────

  describe('enableTotp', () => {
    it('should reject if totpSecret is not set', async () => {
      usersService.findById.mockResolvedValue({ ...mockUser, totpSecret: null });

      await expect(authService.enableTotp('uuid-1', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject invalid totp code', async () => {
      usersService.findById.mockResolvedValue({
        ...mockUser,
        totpSecret: authenticator.generateSecret(),
      });

      await expect(authService.enableTotp('uuid-1', '000000')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyTotpAndLogin', () => {
    it('should reject invalid tempToken', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        authService.verifyTotpAndLogin('bad-token', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject token that is not a 2FA token', async () => {
      jwtService.verify.mockReturnValue({ sub: 'uuid-1' });

      await expect(
        authService.verifyTotpAndLogin('normal-token', '123456'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
