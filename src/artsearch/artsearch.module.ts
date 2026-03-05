import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ArtsearchController } from './artsearch.controller';
import { ArtsearchService } from './artsearch.service';

@Module({
  imports: [HttpModule],
  controllers: [ArtsearchController],
  providers: [ArtsearchService],
})
export class ArtsearchModule {}
