import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HumorapiController } from './humorapi.controller';
import { HumorapiService } from './humorapi.service';

@Module({
  imports: [HttpModule],
  controllers: [HumorapiController],
  providers: [HumorapiService],
})
export class HumorapiModule {}
