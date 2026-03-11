import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SchedulerService } from './scheduler.service';

@Controller('scheduler')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post('run')
  @HttpCode(200)
  run() {
    return this.schedulerService.runCheck();
  }

  @Get('config')
  getConfig() {
    return this.schedulerService.getConfig();
  }

  @Patch('config')
  updateConfig(
    @Body('enabled') enabled?: boolean,
    @Body('intervalType') intervalType?: string,
    @Body('intervalMinutes') intervalMinutes?: number,
    @Body('dailyHour') dailyHour?: number,
    @Body('dailyMinute') dailyMinute?: number,
  ) {
    return this.schedulerService.updateConfig({
      ...(enabled !== undefined ? { enabled } : {}),
      ...(intervalType !== undefined ? { intervalType } : {}),
      ...(intervalMinutes !== undefined ? { intervalMinutes } : {}),
      ...(dailyHour !== undefined ? { dailyHour } : {}),
      ...(dailyMinute !== undefined ? { dailyMinute } : {}),
    });
  }

  @Get('logs')
  getLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.schedulerService.getLogs(page, Math.min(limit, 100));
  }
}
