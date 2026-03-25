import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuthModule } from '../../src/features/auth/auth.module';
import { InventoryModule } from '../../src/features/inventory/inventory.module';
import { UsersModule } from '../../src/features/users/users.module';

/**
 * Bootstrap a fully wired NestJS app against the test database.
 * Uses TypeORM synchronize to auto-create schema, then truncates
 * all tables between tests so each suite starts clean.
 */
export async function createTestApp(): Promise<{
  app: INestApplication;
  module: TestingModule;
  dataSource: DataSource;
}> {
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
          dropSchema: true, // rebuild schema each test run
        }),
      }),
      AuthModule,
      InventoryModule,
      UsersModule,
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

  const dataSource = module.get(DataSource);

  return { app, module, dataSource };
}

/**
 * Truncate all tables — called between test suites or blocks
 * to reset DB state without rebuilding schema.
 */
export async function cleanDatabase(dataSource: DataSource): Promise<void> {
  const tableNames = dataSource.entityMetadatas.map(
    (entity) => `"${entity.tableName}"`,
  );

  if (!tableNames.length) {
    return;
  }

  await dataSource.query(
    `TRUNCATE TABLE ${tableNames.join(', ')} RESTART IDENTITY CASCADE`,
  );
}
