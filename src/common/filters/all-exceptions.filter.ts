import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

// Catches every exception that reaches this point — including ones
// NestJS's own layer didn't anticipate — and always returns a clean,
// consistent JSON error shape instead of an inconsistent or leaky one.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? exception.getResponse()
      : 'Internal server error';

    if (!isHttpException) {
      // Only log full details for genuinely unexpected errors — not
      // for normal 4xx cases like validation failures or 404s.
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(status).json({
      statusCode: status,
      message: typeof message === 'string' ? message : (message as any).message || message,
    });
  }
}
