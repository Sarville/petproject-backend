import { Controller, Get, Query } from '@nestjs/common';
import { WishLogsService } from './wish-logs.service';
import { QueryWishLogsDto } from './dto/query-wish-logs.dto';

@Controller('wish-logs')
export class WishLogsController {
  constructor(private readonly wishLogsService: WishLogsService) {}

  @Get()
  findAll(@Query() query: QueryWishLogsDto) {
    return this.wishLogsService.findAll(query);
  }
}
