import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { SchedulerRunStatus, TransactionStatus } from '@prisma/client';

const JOB_NAME = 'payment-check';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    const config = await this.prisma.schedulerConfig.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });

    if (config.enabled) {
      this.registerCronJob(config);
    }
  }

  async runCheck(): Promise<{ checkedCount: number; updatedCount: number; errors: string[] }> {
    const startedAt = new Date();
    this.logger.log('Starting payment check run');

    const pendingTransactions = await this.prisma.transaction.findMany({
      where: { status: TransactionStatus.PENDING },
      select: { stripePaymentIntentId: true },
    });

    const checkedCount = pendingTransactions.length;
    let updatedCount = 0;
    const errors: string[] = [];

    for (const tx of pendingTransactions) {
      try {
        const result = await this.paymentsService.syncPaymentIntent(tx.stripePaymentIntentId);
        if (!result.alreadyProcessed && result.status !== 'requires_payment_method' && result.status !== 'requires_confirmation' && result.status !== 'requires_action') {
          updatedCount++;
        }
      } catch (err) {
        const msg = `PI ${tx.stripePaymentIntentId}: ${String(err)}`;
        this.logger.error(msg);
        errors.push(msg);
      }
    }

    const finishedAt = new Date();
    let status: SchedulerRunStatus;
    if (errors.length === 0) {
      status = SchedulerRunStatus.SUCCESS;
    } else if (updatedCount > 0 || errors.length < checkedCount) {
      status = SchedulerRunStatus.PARTIAL;
    } else {
      status = SchedulerRunStatus.FAILED;
    }

    await this.prisma.schedulerRun.create({
      data: { startedAt, finishedAt, checkedCount, updatedCount, errors, status },
    });

    this.logger.log(`Run complete: checked=${checkedCount} updated=${updatedCount} errors=${errors.length}`);
    return { checkedCount, updatedCount, errors };
  }

  async getConfig() {
    return this.prisma.schedulerConfig.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });
  }

  async updateConfig(dto: {
    enabled?: boolean;
    intervalType?: string;
    intervalMinutes?: number;
    dailyHour?: number;
    dailyMinute?: number;
  }) {
    const config = await this.prisma.schedulerConfig.update({
      where: { id: 'default' },
      data: dto,
    });

    this.restartCronJob(config);
    return config;
  }

  async getLogs(page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.schedulerRun.findMany({
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.schedulerRun.count(),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  private buildCronExpression(config: { intervalType: string; intervalMinutes: number; dailyHour: number; dailyMinute: number }): string {
    if (config.intervalType === 'MINUTES') {
      return `0 */${config.intervalMinutes} * * * *`;
    }
    return `0 ${config.dailyMinute} ${config.dailyHour} * * *`;
  }

  private registerCronJob(config: { intervalType: string; intervalMinutes: number; dailyHour: number; dailyMinute: number }) {
    const expression = this.buildCronExpression(config);
    this.logger.log(`Registering cron job with expression: ${expression}`);

    const job = new CronJob(expression, () => {
      this.runCheck().catch(err => this.logger.error(`Cron run failed: ${String(err)}`));
    });

    this.schedulerRegistry.addCronJob(JOB_NAME, job);
    job.start();
  }

  private restartCronJob(config: { enabled: boolean; intervalType: string; intervalMinutes: number; dailyHour: number; dailyMinute: number }) {
    try {
      const existing = this.schedulerRegistry.getCronJob(JOB_NAME);
      existing.stop();
      this.schedulerRegistry.deleteCronJob(JOB_NAME);
    } catch {
      // job didn't exist, that's fine
    }

    if (config.enabled) {
      this.registerCronJob(config);
    }
  }
}
