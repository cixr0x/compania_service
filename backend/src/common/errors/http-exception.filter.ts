import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    if (typeof body === 'object' && body !== null && 'message' in body) {
      const exceptionBody = body as {
        message: string | string[];
        errors?: unknown[];
      };
      const message = exceptionBody.message;
      response.status(status).json({
        message: Array.isArray(message) ? 'Validation failed' : message,
        errors: Array.isArray(exceptionBody.errors)
          ? exceptionBody.errors
          : Array.isArray(message)
          ? message.map((item) => ({ message: item }))
          : [],
      });
      return;
    }

    response.status(status).json({ message: exception.message, errors: [] });
  }
}
