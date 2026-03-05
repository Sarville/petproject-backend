import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryRequestLogsDto } from './dto/query-request-logs.dto';

@Injectable()
export class RequestLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryRequestLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortDir = query.sortDir ?? 'desc';

    const where: any = {};
    if (query.method) where.method = query.method.toUpperCase();
    if (query.search) where.url = { contains: query.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.requestLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: sortDir },
      }),
      this.prisma.requestLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
