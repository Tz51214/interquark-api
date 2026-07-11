import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Enforces every DTO's class-validator decorators (@IsEmail, @IsString,
  // etc.) on every request. Without this, those decorators are declared
  // but never actually checked — invalid data would pass straight
  // through to your services.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips any properties not declared on the DTO
      forbidNonWhitelisted: true, // rejects requests that include extra/unknown fields
      transform: true, // converts payloads into actual DTO class instances
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
