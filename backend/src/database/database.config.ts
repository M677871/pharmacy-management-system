import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Database configuration for NestJS TypeORM. Uses environment variables
// configured in `.env` or `.env.test` to select the proper database.

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const synchronizeOverride = config.get<string>('DATABASE_SYNCHRONIZE');

        return {
          type: 'postgres' as const,
          host: config.get<string>('DATABASE_HOST', 'localhost'),
          port: config.get<number>('DATABASE_PORT', 5432),
          username: config.get<string>('DATABASE_USER', 'postgres'),
          password: config.get<string>('DATABASE_PASSWORD', 'postgres'),
          database: config.get<string>('DATABASE_NAME', 'pharmacy'),
          autoLoadEntities: true,
          synchronize:
            synchronizeOverride !== undefined
              ? synchronizeOverride === 'true'
              : config.get<string>('NODE_ENV') !== 'production',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
