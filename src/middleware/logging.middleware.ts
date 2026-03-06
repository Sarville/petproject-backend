import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${method} ${originalUrl}`);

    let body: string | null = null;
    const contentType = req.headers['content-type'] ?? '';
    const isSensitive = /^\/(auth|users)\//i.test(originalUrl);
    if (
      !isSensitive &&
      !['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(method) &&
      (contentType.includes('application/json') || contentType.includes('text/'))
    ) {
      try {
        body = JSON.stringify(req.body) || null;
      } catch {
        // ignore
      }
    }

    this.prisma.requestLog
      .create({ data: { method, url: originalUrl, body } })
      .catch(() => {});

    next();
  }
}
