import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${method} ${originalUrl}`);

    let userId: string | null = null;
    const token = req.cookies?.access_token;
    if (token) {
      try {
        const payload = this.jwtService.verify(token) as { sub?: string };
        userId = payload?.sub ?? null;
      } catch {
        // ignore
      }
    }

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
      .create({ data: { method, url: originalUrl, body, userId } })
      .catch(() => {});

    next();
  }
}
