import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

const DEFAULT_PASSWORD = 'Test1234!';

let emailCounter = 0;

/** Generate a unique email for each test to avoid collisions. */
export function uniqueEmail(): string {
  return `test-${Date.now()}-${++emailCounter}@test.com`;
}

/** Register a new user and return tokens + user. */
export async function registerUser(
  app: INestApplication,
  overrides: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  } = {},
) {
  const email = overrides.email ?? uniqueEmail();
  const password = overrides.password ?? DEFAULT_PASSWORD;

  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({
      email,
      password,
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? 'User',
    })
    .expect(201);

  return {
    email,
    password,
    accessToken: res.body.accessToken as string,
    refreshToken: res.body.refreshToken as string,
    user: res.body.user,
  };
}

/** Register a user then log in, returning auth tokens. */
export async function loginUser(
  app: INestApplication,
  email?: string,
  password?: string,
) {
  const reg = await registerUser(app, { email, password });

  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: reg.email, password: reg.password })
    .expect(200);

  return {
    email: reg.email,
    password: reg.password,
    accessToken: res.body.accessToken as string,
    refreshToken: res.body.refreshToken as string,
    user: res.body.user,
  };
}

export { DEFAULT_PASSWORD };
