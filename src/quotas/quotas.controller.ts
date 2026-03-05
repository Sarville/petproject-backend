import { Controller, Get } from '@nestjs/common';
import { QuotasService } from './quotas.service';

@Controller('quotas')
export class QuotasController {
  constructor(private readonly quotasService: QuotasService) {}

  @Get()
  getAll() {
    return this.quotasService.getAll();
  }
}
