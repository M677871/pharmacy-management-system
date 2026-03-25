import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import * as request from 'supertest';
import { createTestApp, cleanDatabase } from '../helpers/test-app';
import { registerUser, uniqueEmail, DEFAULT_PASSWORD } from '../helpers/auth.helper';
import { User, UserRole } from '../../src/features/users/entities/user.entity';

describe('Auth – Role-Based Access Control (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepo: Repository<User>;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    dataSource = ctx.dataSource;
    userRepo = dataSource.getRepository(User);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(dataSource);
  });

  /** Helper: register a user then promote to given role directly in DB. */
  async function registerWithRole(role: UserRole) {
    const reg = await registerUser(app);
    await userRepo.update({ email: reg.email }, { role });
    // Re-login so the JWT contains the updated role
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: reg.email, password: reg.password })
      .expect(200);
    return {
      ...reg,
      accessToken: loginRes.body.accessToken,
      refreshToken: loginRes.body.refreshToken,
    };
  }

  // ── GET /api/users  (admin-only) ────────────────────────────────────

  describe('GET /api/users (admin-only)', () => {
    it('should allow admin to list users', async () => {
      const admin = await registerWithRole(UserRole.ADMIN);

      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should deny customer access', async () => {
      const customer = await registerWithRole(UserRole.CUSTOMER);

      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .expect(403);
    });

    it('should deny employee access', async () => {
      const employee = await registerWithRole(UserRole.EMPLOYEE);

      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${employee.accessToken}`)
        .expect(403);
    });

    it('should deny unauthenticated access', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .expect(401);
    });
  });

  describe('POST /api/users (admin-only creation)', () => {
    it('should allow admin to create an employee user', async () => {
      const admin = await registerWithRole(UserRole.ADMIN);
      const email = uniqueEmail();

      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({
          email,
          password: DEFAULT_PASSWORD,
          firstName: 'Employee',
          lastName: 'Creator',
          role: UserRole.EMPLOYEE,
        })
        .expect(201);

      expect(res.body.email).toBe(email);
      expect(res.body.role).toBe(UserRole.EMPLOYEE);
      expect(res.body).not.toHaveProperty('password');
    });

    it('should allow admin to create another admin user', async () => {
      const admin = await registerWithRole(UserRole.ADMIN);
      const email = uniqueEmail();

      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({
          email,
          password: DEFAULT_PASSWORD,
          firstName: 'Second',
          lastName: 'Admin',
          role: UserRole.ADMIN,
        })
        .expect(201);

      expect(res.body.role).toBe(UserRole.ADMIN);
    });

    it('should deny employee user creation', async () => {
      const employee = await registerWithRole(UserRole.EMPLOYEE);

      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${employee.accessToken}`)
        .send({
          email: uniqueEmail(),
          password: DEFAULT_PASSWORD,
          firstName: 'Blocked',
          lastName: 'Employee',
          role: UserRole.CUSTOMER,
        })
        .expect(403);
    });

    it('should deny customer user creation', async () => {
      const customer = await registerWithRole(UserRole.CUSTOMER);

      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({
          email: uniqueEmail(),
          password: DEFAULT_PASSWORD,
          firstName: 'Blocked',
          lastName: 'Customer',
          role: UserRole.CUSTOMER,
        })
        .expect(403);
    });

    it('should require a role for admin-created users', async () => {
      const admin = await registerWithRole(UserRole.ADMIN);

      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({
          email: uniqueEmail(),
          password: DEFAULT_PASSWORD,
          firstName: 'Missing',
          lastName: 'Role',
        })
        .expect(400);
    });
  });

  // ── Protected profile route – all roles should access ───────────────

  describe('GET /api/auth/profile (any authenticated role)', () => {
    it('admin can access profile', async () => {
      const admin = await registerWithRole(UserRole.ADMIN);

      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(200);
    });

    it('employee can access profile', async () => {
      const employee = await registerWithRole(UserRole.EMPLOYEE);

      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${employee.accessToken}`)
        .expect(200);
    });

    it('customer can access profile', async () => {
      const customer = await registerWithRole(UserRole.CUSTOMER);

      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .expect(200);
    });
  });
});
