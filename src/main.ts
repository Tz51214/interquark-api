import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

// Safety nets: without these, an unhandled promise rejection or an
// uncaught exception anywhere in the process (not just inside a
// request handler) can silently crash the entire server, taking down
// the API for every user until someone manually restarts it.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());

  // Serves uploaded message attachments (PDF/JPG) at /uploads/<filename>.
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

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

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
