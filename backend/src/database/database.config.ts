import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  getRequiredNumber,
  getRequiredString,
  parseBooleanConfig,
} from '../config/env';

// Database configuration for NestJS TypeORM. Uses environment variables
// configured in `.env` or `.env.test` to select the proper database.

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = getRequiredString(config, 'NODE_ENV');
        const synchronize = parseBooleanConfig(
          getRequiredString(config, 'DATABASE_SYNCHRONIZE'),
          'DATABASE_SYNCHRONIZE',
        );

        if (nodeEnv === 'production' && synchronize) {
          throw new Error('DATABASE_SYNCHRONIZE must be false in production.');
        }

        return {
          type: 'postgres' as const,
          host: getRequiredString(config, 'DATABASE_HOST'),
          port: getRequiredNumber(config, 'DATABASE_PORT'),
          username: getRequiredString(config, 'DATABASE_USER'),
          password: getRequiredString(config, 'DATABASE_PASSWORD'),
          database: getRequiredString(config, 'DATABASE_NAME'),
          autoLoadEntities: true,
          synchronize,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
