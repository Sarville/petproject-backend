import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryRequestLogsDto } from './dto/query-request-logs.dto';

@Injectable()
export class RequestLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryRequestLogsDto, userId: string, isAdmin: boolean) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortDir = query.sortDir ?? 'desc';

    const where: Prisma.RequestLogWhereInput = {
      ...(!isAdmin && { userId }),
      ...(query.method && { method: query.method.toUpperCase() }),
      ...(query.search && { url: { contains: query.search, mode: 'insensitive' as const } }),
    };

    const total = await this.prisma.requestLog.count({ where });

    const data = isAdmin
      ? await this.prisma.requestLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: sortDir },
          include: { user: { select: { email: true } } },
        })
      : await this.prisma.requestLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: sortDir },
        });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
