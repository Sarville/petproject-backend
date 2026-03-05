import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryWishLogsDto } from './dto/query-wish-logs.dto';

@Injectable()
export class WishLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryWishLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortDir = query.sortDir ?? 'desc';

    const where: any = {};
    if (query.action) where.action = query.action;
    if (query.search) where.wishTitle = { contains: query.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.wishLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: sortDir },
      }),
      this.prisma.wishLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
