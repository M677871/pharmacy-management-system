import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import {
  buildHttpCorsOptions,
  getRequiredNumber,
  getRequiredString,
} from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors(buildHttpCorsOptions(configService));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = getRequiredNumber(configService, 'PORT');
  const host = getRequiredString(configService, 'HOST');
  await app.listen(port, host);
  console.log(`Backend running on ${host}:${port}`);
}
bootstrap();
