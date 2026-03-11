import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuthModule } from '../../src/features/auth/auth.module';
import { UsersModule } from '../../src/features/users/users.module';
import { User } from '../../src/features/users/entities/user.entity';

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
          entities: [User],
          synchronize: true,
          dropSchema: true, // rebuild schema each test run
        }),
      }),
      AuthModule,
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
  const entities = dataSource.entityMetadatas;
  for (const entity of entities) {
    const repo = dataSource.getRepository(entity.name);
    await repo.query(
      `TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE`,
    );
  }
}
