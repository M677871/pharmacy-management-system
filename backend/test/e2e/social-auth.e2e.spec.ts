import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { createTestApp, cleanDatabase } from '../helpers/test-app';
import { registerUser } from '../helpers/auth.helper';

/**
 * Social auth routes (Google, Facebook, Instagram) redirect to external
 * OAuth providers. We can't follow those redirects in automated tests,
 * but we CAN verify the routes exist and behave correctly:
 *   - GET /api/auth/{provider}       → 302 redirect
 *   - GET /api/auth/{provider}/callback → handled (though fails without real code)
 *
 * The actual handleSocialLogin service method is tested via unit tests.
 */
describe('Auth – Social OAuth Routes (e2e)', () => {
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

  // ── Google ──────────────────────────────────────────────────────────

  describe('GET /api/auth/google', () => {
    it('should redirect to Google OAuth', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/google')
        .expect(302);

      expect(res.headers.location).toContain('accounts.google.com');
    });
  });

  describe('GET /api/auth/google/callback', () => {
    it('should return 302 or error without a valid authorization code', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/google/callback')
        .query({ code: 'fake-code' });

      // Without a real OAuth code Google strategy will fail → 302 or 5xx
      // We just verify the route is mounted and responds
      expect([302, 401, 403, 500]).toContain(res.status);
    });
  });

  // ── Facebook ────────────────────────────────────────────────────────

  describe('GET /api/auth/facebook', () => {
    it('should redirect to Facebook OAuth', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/facebook')
        .expect(302);

      expect(res.headers.location).toContain('facebook.com');
    });
  });

  describe('GET /api/auth/facebook/callback', () => {
    it('should respond without a valid authorization code', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/facebook/callback')
        .query({ code: 'fake-code' });

      expect([302, 401, 403, 500]).toContain(res.status);
    });
  });

  // ── Instagram ───────────────────────────────────────────────────────

  describe('GET /api/auth/instagram', () => {
    it('should redirect to Instagram OAuth', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/instagram')
        .expect(302);

      expect(res.headers.location).toContain('instagram.com');
    });
  });

  describe('GET /api/auth/instagram/callback', () => {
    it('should respond without a valid authorization code', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/instagram/callback')
        .query({ code: 'fake-code' });

      expect([302, 401, 403, 500]).toContain(res.status);
    });
  });
});
