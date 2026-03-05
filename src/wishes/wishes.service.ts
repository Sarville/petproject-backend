import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateWishDto } from './dto/update-wish.dto';
import { QueryWishesDto } from './dto/query-wishes.dto';

@Injectable()
export class WishesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryWishesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim() ?? '';
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.wish.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.wish.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const wish = await this.prisma.wish.findUnique({ where: { id } });
    if (!wish) throw new NotFoundException(`Wish ${id} not found`);
    return wish;
  }

  async create(dto: CreateWishDto) {
    const wish = await this.prisma.wish.create({ data: dto });
    await this.prisma.wishLog.create({
      data: {
        action: 'CREATE',
        wishId: wish.id,
        wishTitle: wish.title,
        newValues: { title: wish.title, description: wish.description },
      },
    });
    return wish;
  }

  async update(id: string, dto: UpdateWishDto) {
    const existing = await this.findOne(id);
    const wish = await this.prisma.wish.update({ where: { id }, data: dto });
    await this.prisma.wishLog.create({
      data: {
        action: 'UPDATE',
        wishId: wish.id,
        wishTitle: wish.title,
        oldValues: { title: existing.title, description: existing.description },
        newValues: { title: wish.title, description: wish.description },
      },
    });
    return wish;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    await this.prisma.wish.delete({ where: { id } });
    await this.prisma.wishLog.create({
      data: {
        action: 'DELETE',
        wishId: existing.id,
        wishTitle: existing.title,
        oldValues: { title: existing.title, description: existing.description },
      },
    });
  }
}
