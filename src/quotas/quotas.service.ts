import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULTS: Record<string, number> = {
  artsearch: 100,
  humorapi: 10,
};

@Injectable()
export class QuotasService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<Record<string, number>> {
    const todayUtc = new Date().toISOString().slice(0, 10);
    const result: Record<string, number> = {};

    for (const api of Object.keys(DEFAULTS)) {
      const row = await this.prisma.apiQuota.findUnique({ where: { api } });
      const rowDateUtc = row?.updatedAt.toISOString().slice(0, 10);

      if (!row || rowDateUtc !== todayUtc) {
        const defaultValue = DEFAULTS[api];
        await this.prisma.apiQuota.upsert({
          where: { api },
          update: { quotaLeft: defaultValue, updatedAt: new Date() },
          create: { api, quotaLeft: defaultValue },
        });
        result[api] = defaultValue;
      } else {
        result[api] = row.quotaLeft;
      }
    }

    return result;
  }

  update(api: string, quotaLeft: number): void {
    const clamped = Math.max(0, quotaLeft);
    this.prisma.apiQuota.upsert({
      where: { api },
      update: { quotaLeft: clamped, updatedAt: new Date() },
      create: { api, quotaLeft: clamped },
    }).catch(() => { /* ignore */ });
  }
}
