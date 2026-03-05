import { Controller, Get, Query } from '@nestjs/common';
import { RequestLogsService } from './request-logs.service';
import { QueryRequestLogsDto } from './dto/query-request-logs.dto';

@Controller('request-logs')
export class RequestLogsController {
  constructor(private readonly requestLogsService: RequestLogsService) {}

  @Get()
  findAll(@Query() query: QueryRequestLogsDto) {
    return this.requestLogsService.findAll(query);
  }
}
