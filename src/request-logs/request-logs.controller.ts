import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestLogsService } from './request-logs.service';
import { QueryRequestLogsDto } from './dto/query-request-logs.dto';

interface RequestUser { id: string; email: string; role: string }

@Controller('request-logs')
@UseGuards(JwtAuthGuard)
export class RequestLogsController {
  constructor(private readonly requestLogsService: RequestLogsService) {}

  @Get()
  findAll(@Query() query: QueryRequestLogsDto, @CurrentUser() user: RequestUser) {
    return this.requestLogsService.findAll(query, user.id, user.role === 'ADMIN');
  }
}
