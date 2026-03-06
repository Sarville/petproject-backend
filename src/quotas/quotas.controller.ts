import { Controller, Get, UseGuards } from '@nestjs/common';
import { QuotasService } from './quotas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('quotas')
@UseGuards(JwtAuthGuard)
export class QuotasController {
  constructor(private readonly quotasService: QuotasService) {}

  @Get()
  getAll() {
    return this.quotasService.getAll();
  }
}
