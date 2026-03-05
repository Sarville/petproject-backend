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
}
