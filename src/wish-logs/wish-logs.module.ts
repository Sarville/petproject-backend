import { Module } from '@nestjs/common';
import { WishLogsController } from './wish-logs.controller';
import { WishLogsService } from './wish-logs.service';

@Module({
  controllers: [WishLogsController],
  providers: [WishLogsService],
})
export class WishLogsModule {}
