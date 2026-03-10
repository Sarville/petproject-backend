import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(data: { email: string; passwordHash?: string; googleId?: string; role?: UserRole }) {
    return this.prisma.user.create({ data });
  }

  linkGoogleId(id: string, googleId: string) {
    return this.prisma.user.update({ where: { id }, data: { googleId } });
  }

  updateRole(id: string, role: UserRole) {
    return this.prisma.user.update({ where: { id }, data: { role } });
  }

  async getBalance(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { balance: true, stripePaymentMethodId: true },
    });
    if (!user) return null;
    return { balance: user.balance, hasSavedCard: !!user.stripePaymentMethodId };
  }

  getTransactions(id: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return Promise.all([
      this.prisma.transaction.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          failureReason: true,
          createdAt: true,
        },
      }),
      this.prisma.transaction.count({ where: { userId: id } }),
    ]).then(([data, total]) => ({ data, total, page, limit }));
  }
}
