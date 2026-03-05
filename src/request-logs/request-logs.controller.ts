import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestLogsService } from './request-logs.service';
import { QueryRequestLogsDto } from './dto/query-request-logs.dto';

@Controller('request-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class RequestLogsController {
  constructor(private readonly requestLogsService: RequestLogsService) {}

  @Get()
  findAll(@Query() query: QueryRequestLogsDto) {
    return this.requestLogsService.findAll(query);
  }
}
