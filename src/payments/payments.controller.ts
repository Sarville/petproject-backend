import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  createIntent(@CurrentUser() user: { id: string; email: string }) {
    return this.paymentsService.createPaymentIntent(user.id, user.email);
  }

  @Post('update-intent-setup')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  updateIntentSetup(
    @Body('paymentIntentId') paymentIntentId: string,
    @Body('saveMethod') saveMethod: boolean,
  ) {
    if (!paymentIntentId) throw new BadRequestException('paymentIntentId is required');
    return this.paymentsService.updateIntentSetup(paymentIntentId, saveMethod ?? false);
  }

  @Post('sync-intent')
  @UseGuards(JwtAuthGuard)
  syncIntent(@Body('paymentIntentId') paymentIntentId: string) {
    if (!paymentIntentId) throw new BadRequestException('paymentIntentId is required');
    return this.paymentsService.syncPaymentIntent(paymentIntentId);
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) throw new BadRequestException('Missing stripe-signature header');
    const rawBody = req.rawBody;
    if (!rawBody) throw new BadRequestException('Missing raw body');
    await this.paymentsService.handleWebhook(rawBody, signature);
    return { received: true };
  }
}
