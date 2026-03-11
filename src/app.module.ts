import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WishesModule } from './wishes/wishes.module';
import { WishLogsModule } from './wish-logs/wish-logs.module';
import { RequestLogsModule } from './request-logs/request-logs.module';
import { ArtsearchModule } from './artsearch/artsearch.module';
import { HumorapiModule } from './humorapi/humorapi.module';
import { QuotasModule } from './quotas/quotas.module';
import { PaymentsModule } from './payments/payments.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { LoggingMiddleware } from './middleware/logging.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    QuotasModule,
    WishesModule,
    WishLogsModule,
    RequestLogsModule,
    ArtsearchModule,
    HumorapiModule,
    PaymentsModule,
    SchedulerModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggingMiddleware)
      .exclude({ path: 'request-logs', method: RequestMethod.ALL })
      .forRoutes('*');
  }
}
