import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as request from 'supertest';
import { cleanDatabase } from '../helpers/test-app';
import { registerUser } from '../helpers/auth.helper';
import { User, UserRole } from '../../src/features/users/entities/user.entity';
import { Notification } from '../../src/features/notifications/entities/notification.entity';
import { ChatMessage } from '../../src/features/messaging/entities/chat-message.entity';
import { AuthModule } from '../../src/features/auth/auth.module';
import { UsersModule } from '../../src/features/users/users.module';
import { NotificationsModule } from '../../src/features/notifications/notifications.module';
import { MessagingModule } from '../../src/features/messaging/messaging.module';
import { MediaModule } from '../../src/features/media/media.module';
import { CallsModule } from '../../src/features/calls/calls.module';
import { MeetingsModule } from '../../src/features/meetings/meetings.module';
import { PresenceService } from '../../src/features/realtime/core/presence.service';

jest.setTimeout(180000);

async function createCommunicationsTestApp() {
  process.env.NODE_ENV ??= 'test';
  process.env.MAIL_TRANSPORT ??= 'memory';
  process.env.MAIL_FROM ??= 'pharmaflow-test@local.test';
  process.env.FRONTEND_RESET_PASSWORD_URL ??=
    'http://localhost:5173/auth/reset-password';
  process.env.PASSWORD_RESET_MODE ??= 'otp';
  process.env.PASSWORD_RESET_OTP_LENGTH ??= '6';
  process.env.PASSWORD_RESET_OTP_TTL_MINUTES ??= '10';
  process.env.PASSWORD_RESET_OTP_MAX_ATTEMPTS ??= '5';
  process.env.PASSWORD_RESET_EXPOSE_OTP ??= 'true';

  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          type: 'postgres' as const,
          host: config.get<string>('DATABASE_HOST', 'localhost'),
          port: config.get<number>('DATABASE_PORT', 5432),
          username: config.get<string>('DATABASE_USER', 'postgres'),
          password: config.get<string>('DATABASE_PASSWORD', 'postgres'),
          database: config.get<string>('DATABASE_NAME', 'pharmacy_test'),
          autoLoadEntities: true,
          synchronize: true,
          dropSchema: true,
        }),
      }),
      AuthModule,
      UsersModule,
      NotificationsModule,
      MessagingModule,
      MediaModule,
      CallsModule,
      MeetingsModule,
    ],
  }).compile();

  const app = module.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  return {
    app,
    dataSource: module.get(DataSource),
  };
}

describe('Realtime communications (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepo: Repository<User>;
  let notificationRepo: Repository<Notification>;
  let chatRepo: Repository<ChatMessage>;
  let presenceService: PresenceService;

  beforeAll(async () => {
    const ctx = await createCommunicationsTestApp();
    app = ctx.app;
    dataSource = ctx.dataSource;
    userRepo = dataSource.getRepository(User);
    notificationRepo = dataSource.getRepository(Notification);
    chatRepo = dataSource.getRepository(ChatMessage);
    presenceService = app.get(PresenceService);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(dataSource);
  });

  async function registerWithRole(role: UserRole) {
    const reg = await registerUser(app);
    await userRepo.update({ email: reg.email }, { role });
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: reg.email, password: reg.password })
      .expect(200);

    return {
      ...reg,
      accessToken: loginRes.body.accessToken as string,
      user: {
        ...reg.user,
        id: reg.user.id as string,
        role,
      },
    };
  }

  async function markUserOnline(userId: string) {
    const userEntity = await userRepo.findOneByOrFail({ id: userId });
    const socketId = `test-socket:${userId}:${Date.now()}`;
    presenceService.registerConnection(socketId, userEntity);

    return () => presenceService.unregisterConnection(socketId);
  }

  describe('meetings', () => {
    it('denies customers and allows staff to create invited meetings', async () => {
      const admin = await registerWithRole(UserRole.ADMIN);
      const employee = await registerWithRole(UserRole.EMPLOYEE);
      const customer = await registerWithRole(UserRole.CUSTOMER);

      await request(app.getHttpServer())
        .post('/api/meetings')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({
          title: 'Customer blocked',
          scheduledStartAt: new Date(Date.now() + 60_000).toISOString(),
          durationMinutes: 30,
          participantIds: [employee.user.id],
        })
        .expect(403);

      const res = await request(app.getHttpServer())
        .post('/api/meetings')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({
          title: 'Daily staff sync',
          agenda: 'Review orders and inventory risks.',
          scheduledStartAt: new Date(Date.now() + 60_000).toISOString(),
          durationMinutes: 30,
          participantIds: [employee.user.id],
        })
        .expect(201);

      expect(res.body.title).toBe('Daily staff sync');
      expect(res.body.participants).toHaveLength(2);

      const invite = await notificationRepo.findOne({
        where: { userId: employee.user.id },
      });
      expect(invite?.title).toContain('Meeting invitation');
      expect(invite?.metadata).toMatchObject({ meetingId: res.body.id });

      const message = await chatRepo.findOne({
        where: {
          senderId: admin.user.id,
          recipientId: employee.user.id,
        },
      });
      expect(message?.body).toContain(`/meetings/${res.body.id}`);
    });

    it('denies uninvited staff and customers from joining a meeting', async () => {
      const admin = await registerWithRole(UserRole.ADMIN);
      const invitedEmployee = await registerWithRole(UserRole.EMPLOYEE);
      const uninvitedEmployee = await registerWithRole(UserRole.EMPLOYEE);
      const customer = await registerWithRole(UserRole.CUSTOMER);

      const meeting = await request(app.getHttpServer())
        .post('/api/meetings')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({
          title: 'Private staff sync',
          scheduledStartAt: new Date(Date.now() + 60_000).toISOString(),
          durationMinutes: 30,
          participantIds: [invitedEmployee.user.id],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/meetings/${meeting.body.id}/join`)
        .set('Authorization', `Bearer ${uninvitedEmployee.accessToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .post(`/api/meetings/${meeting.body.id}/join`)
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .post(`/api/meetings/${meeting.body.id}/join`)
        .set('Authorization', `Bearer ${invitedEmployee.accessToken}`)
        .expect(201);
    });

    it('protects meeting notes, recordings, and caption translation state', async () => {
      const previousProvider = process.env.TRANSLATION_PROVIDER;
      process.env.TRANSLATION_PROVIDER = 'generic-http';
      process.env.TRANSLATION_API_URL = 'http://127.0.0.1:1/translate';
      process.env.TRANSLATION_API_KEY = 'test-key';

      const admin = await registerWithRole(UserRole.ADMIN);
      const employee = await registerWithRole(UserRole.EMPLOYEE);
      const outsider = await registerWithRole(UserRole.EMPLOYEE);

      const meeting = await request(app.getHttpServer())
        .post('/api/meetings')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({
          title: 'Recorded sync',
          scheduledStartAt: new Date(Date.now() + 60_000).toISOString(),
          durationMinutes: 30,
          participantIds: [employee.user.id],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/meetings/${meeting.body.id}/join`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(201);

      const note = await request(app.getHttpServer())
        .post(`/api/meetings/${meeting.body.id}/notes`)
        .set('Authorization', `Bearer ${employee.accessToken}`)
        .send({ content: 'Follow up with warehouse.' })
        .expect(201);
      expect(note.body.content).toBe('Follow up with warehouse.');

      await request(app.getHttpServer())
        .get(`/api/meetings/${meeting.body.id}/notes`)
        .set('Authorization', `Bearer ${outsider.accessToken}`)
        .expect(403);

      const recording = await request(app.getHttpServer())
        .post(`/api/meetings/${meeting.body.id}/recordings`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          durationSeconds: 0,
          mimeType: 'video/webm',
        })
        .expect(201);
      expect(recording.body.hasFile).toBe(false);

      await request(app.getHttpServer())
        .get(`/api/meetings/${meeting.body.id}/recordings`)
        .set('Authorization', `Bearer ${outsider.accessToken}`)
        .expect(403);

      const caption = await request(app.getHttpServer())
        .post(`/api/meetings/${meeting.body.id}/captions`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({
          text: 'Inventory check is complete',
          sourceLanguage: 'en',
          targetLanguage: 'fr',
        })
        .expect(201);
      expect(['failed', 'disabled']).toContain(caption.body.translationStatus);

      if (previousProvider === undefined) {
        delete process.env.TRANSLATION_PROVIDER;
      } else {
        process.env.TRANSLATION_PROVIDER = previousProvider;
      }
      delete process.env.TRANSLATION_API_URL;
      delete process.env.TRANSLATION_API_KEY;
    });
  });

  describe('calls', () => {
    it('supports call lifecycle and denies non-participants', async () => {
      const customer = await registerWithRole(UserRole.CUSTOMER);
      const employee = await registerWithRole(UserRole.EMPLOYEE);
      const outsider = await registerWithRole(UserRole.CUSTOMER);
      const unregisterEmployee = await markUserOnline(employee.user.id);

      try {
        const call = await request(app.getHttpServer())
          .post('/api/calls')
          .set('Authorization', `Bearer ${customer.accessToken}`)
          .send({
            recipientId: employee.user.id,
            type: 'video',
          })
          .expect(201);

        expect(call.body.status).toBe('ringing');

        await request(app.getHttpServer())
          .get(`/api/calls/${call.body.id}`)
          .set('Authorization', `Bearer ${outsider.accessToken}`)
          .expect(403);

        const accepted = await request(app.getHttpServer())
          .post(`/api/calls/${call.body.id}/accept`)
          .set('Authorization', `Bearer ${employee.accessToken}`)
          .expect(201);
        expect(accepted.body.status).toBe('active');

        const ended = await request(app.getHttpServer())
          .post(`/api/calls/${call.body.id}/end`)
          .set('Authorization', `Bearer ${customer.accessToken}`)
          .expect(201);
        expect(ended.body.status).toBe('ended');
      } finally {
        unregisterEmployee();
      }
    });

    it('does not keep ringing when the recipient is offline', async () => {
      const customer = await registerWithRole(UserRole.CUSTOMER);
      const employee = await registerWithRole(UserRole.EMPLOYEE);

      const call = await request(app.getHttpServer())
        .post('/api/calls')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({
          recipientId: employee.user.id,
          type: 'voice',
        })
        .expect(201);

      expect(call.body.status).toBe('missed');
      expect(call.body.endedAt).not.toBeNull();

      await request(app.getHttpServer())
        .post(`/api/calls/${call.body.id}/accept`)
        .set('Authorization', `Bearer ${employee.accessToken}`)
        .expect(400);
    });

    it('protects call recordings and creates caption segments', async () => {
      const customer = await registerWithRole(UserRole.CUSTOMER);
      const employee = await registerWithRole(UserRole.EMPLOYEE);
      const outsider = await registerWithRole(UserRole.CUSTOMER);
      const unregisterEmployee = await markUserOnline(employee.user.id);

      try {
        const call = await request(app.getHttpServer())
          .post('/api/calls')
          .set('Authorization', `Bearer ${customer.accessToken}`)
          .send({
            recipientId: employee.user.id,
            type: 'voice',
          })
          .expect(201);

        await request(app.getHttpServer())
          .post(`/api/calls/${call.body.id}/accept`)
          .set('Authorization', `Bearer ${employee.accessToken}`)
          .expect(201);

        const recording = await request(app.getHttpServer())
          .post(`/api/calls/${call.body.id}/recordings`)
          .set('Authorization', `Bearer ${customer.accessToken}`)
          .send({
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
            durationSeconds: 0,
            mimeType: 'audio/webm',
          })
          .expect(201);
        expect(recording.body.callId).toBe(call.body.id);
        expect(recording.body.downloadUrl).toBeNull();

        await request(app.getHttpServer())
          .get(`/api/calls/${call.body.id}/recordings`)
          .set('Authorization', `Bearer ${outsider.accessToken}`)
          .expect(403);

        const caption = await request(app.getHttpServer())
          .post(`/api/calls/${call.body.id}/captions`)
          .set('Authorization', `Bearer ${employee.accessToken}`)
          .send({
            text: 'Your order is ready',
            sourceLanguage: 'en',
            targetLanguage: 'es',
          })
          .expect(201);
        expect(caption.body.text).toBe('Your order is ready');
        expect(caption.body.translationStatus).toBe('disabled');
      } finally {
        unregisterEmployee();
      }
    });
  });
});
