import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { createTestApp, cleanDatabase } from '../helpers/test-app';
import {
  registerUser,
  loginUser,
  uniqueEmail,
  DEFAULT_PASSWORD,
} from '../helpers/auth.helper';

describe('Auth – Registration & Login (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    dataSource = ctx.dataSource;
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(dataSource);
  });

  // ── Registration ────────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const email = uniqueEmail();
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email, password: DEFAULT_PASSWORD })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.role).toBe('customer');
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.user).not.toHaveProperty('refreshToken');
    });

    it('should reject duplicate email', async () => {
      const email = uniqueEmail();
      await registerUser(app, { email });

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email, password: DEFAULT_PASSWORD })
        .expect(409);

      expect(res.body.message).toMatch(/already registered/i);
    });

    it('should reject missing email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ password: DEFAULT_PASSWORD })
        .expect(400);
    });

    it('should reject short password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: uniqueEmail(), password: 'short' })
        .expect(400);
    });

    it('should reject role injection in public registration', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: uniqueEmail(),
          password: DEFAULT_PASSWORD,
          role: 'admin',
        })
        .expect(400);
    });
  });

  // ── Login ───────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('should log in with valid credentials and return tokens', async () => {
      const { email, password } = await registerUser(app);

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe(email);
    });

    it('should reject invalid password', async () => {
      const { email } = await registerUser(app);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'WrongPassword1!' })
        .expect(401);
    });

    it('should reject non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: DEFAULT_PASSWORD })
        .expect(401);
    });
  });

  // ── Profile (protected) ─────────────────────────────────────────────

  describe('GET /api/auth/profile', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401);
    });

    it('should return profile with valid token', async () => {
      const { accessToken, email } = await registerUser(app);

      const res = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(email);
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('totpSecret');
    });

    it('should reject an invalid / garbage token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer garbage.token.here')
        .expect(401);
    });
  });

  // ── Refresh Token ───────────────────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    it('should issue new tokens with a valid refresh token', async () => {
      const { refreshToken } = await loginUser(app);

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      // New refresh token should differ from old one
      expect(res.body.refreshToken).not.toBe(refreshToken);
    });

    it('should reject an invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.refresh.token' })
        .expect(401);
    });

    it('should reject a refresh token after logout (rotation)', async () => {
      const { accessToken, refreshToken } = await loginUser(app);

      // Logout clears the stored hash
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Old refresh token should now be rejected
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  // ── Logout ──────────────────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('should log out and return success', async () => {
      const { accessToken } = await loginUser(app);

      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.message).toMatch(/logged out/i);
    });

    it('should require a valid token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(401);
    });
  });
});
