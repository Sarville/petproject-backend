import { ConflictException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ADJECTIVES = [
  'Notorious', 'Silent', 'Ancient', 'Bright', 'Calm', 'Daring', 'Eager', 'Fierce',
  'Gentle', 'Happy', 'Icy', 'Jolly', 'Kind', 'Lively', 'Mighty', 'Noble', 'Odd',
  'Proud', 'Quick', 'Rapid', 'Shiny', 'Tall', 'Urban', 'Vivid', 'Wild', 'Xenial',
  'Youthful', 'Zany', 'Brave', 'Clever', 'Dizzy', 'Epic', 'Fuzzy', 'Grumpy',
  'Hasty', 'Ironic', 'Jazzy', 'Keen', 'Lazy', 'Misty', 'Nervy', 'Oblique',
  'Peppy', 'Quirky', 'Rusty', 'Sassy', 'Trendy', 'Upbeat', 'Witty',
];

const ANIMALS = [
  'Camel', 'Tiger', 'Eagle', 'Panda', 'Wolf', 'Fox', 'Bear', 'Hawk', 'Lion', 'Lynx',
  'Moose', 'Otter', 'Raven', 'Shark', 'Snake', 'Viper', 'Whale', 'Zebra', 'Bison', 'Crane',
  'Dingo', 'Falcon', 'Gecko', 'Heron', 'Iguana', 'Jaguar', 'Koala', 'Lemur', 'Manta', 'Narwhal',
  'Osprey', 'Parrot', 'Quail', 'Rhino', 'Sloth', 'Tapir', 'Uakari', 'Vulture', 'Walrus', 'Xerus',
  'Yak', 'Zorilla', 'Axolotl', 'Bobcat', 'Condor', 'Dugong', 'Ermine', 'Ferret', 'Gibbon', 'Hyena',
];

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
      select: { id: true, email: true, role: true, balance: true, nickname: true, avatar: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateProfile(id: string, nickname?: string, avatar?: string) {
    if (nickname) {
      const existing = await this.prisma.user.findFirst({ where: { nickname, NOT: { id } } });
      if (existing) throw new ConflictException('Nickname already taken');
    }
    return this.prisma.user.update({
      where: { id },
      data: { ...(nickname !== undefined ? { nickname } : {}), ...(avatar !== undefined ? { avatar } : {}) },
      select: { id: true, email: true, role: true, balance: true, nickname: true, avatar: true },
    });
  }

  async generateNickname(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
      const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      const candidate = `${adj} ${animal}`;
      const exists = await this.prisma.user.findFirst({ where: { nickname: candidate } });
      if (!exists) return candidate;
    }
    // fallback with suffix
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    return `${adj} ${animal}${Math.floor(Math.random() * 99) + 1}`;
  }

  getAllTransactions(page: number, limit: number) {
    const skip = (page - 1) * limit;
    return Promise.all([
      this.prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
          user: { select: { id: true, email: true, nickname: true, avatar: true } },
        },
      }),
      this.prisma.transaction.count(),
    ]).then(([data, total]) => ({ data, total, page, limit }));
  }

  async getStats() {
    const [users, wishes, transactions] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.wish.count(),
      this.prisma.transaction.count(),
    ]);
    return { users, wishes, transactions };
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
