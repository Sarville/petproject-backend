import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { WishesService } from './wishes.service';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateWishDto } from './dto/update-wish.dto';
import { QueryWishesDto } from './dto/query-wishes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface RequestUser { id: string; email: string; role: string }

@Controller('wishes')
@UseGuards(JwtAuthGuard)
export class WishesController {
  constructor(private readonly wishesService: WishesService) {}

  @Get()
  findAll(@Query() query: QueryWishesDto, @CurrentUser() user: RequestUser) {
    return this.wishesService.findAll(query, user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.wishesService.findOne(id, user.id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateWishDto, @CurrentUser() user: RequestUser) {
    return this.wishesService.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWishDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.wishesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.wishesService.remove(id, user.id);
  }
}
