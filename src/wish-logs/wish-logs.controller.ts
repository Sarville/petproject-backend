import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { WishLogsService } from './wish-logs.service';
import { QueryWishLogsDto } from './dto/query-wish-logs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface RequestUser { id: string; email: string; role: string }

@Controller('wish-logs')
@UseGuards(JwtAuthGuard)
export class WishLogsController {
  constructor(private readonly wishLogsService: WishLogsService) {}

  @Get()
  findAll(@Query() query: QueryWishLogsDto, @CurrentUser() user: RequestUser) {
    return this.wishLogsService.findAll(query, user.id, user.role === 'ADMIN');
  }
}
