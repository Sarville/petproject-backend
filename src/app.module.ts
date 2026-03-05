import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { WishesModule } from './wishes/wishes.module';
import { WishLogsModule } from './wish-logs/wish-logs.module';
import { RequestLogsModule } from './request-logs/request-logs.module';
import { ArtsearchModule } from './artsearch/artsearch.module';
import { HumorapiModule } from './humorapi/humorapi.module';
import { QuotasModule } from './quotas/quotas.module';
import { LoggingMiddleware } from './middleware/logging.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    QuotasModule,
    WishesModule,
    WishLogsModule,
    RequestLogsModule,
    ArtsearchModule,
    HumorapiModule,
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
