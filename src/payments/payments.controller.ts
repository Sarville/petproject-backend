import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { PAYMENTS_QUEUE, WEBHOOK_JOB } from './payments.queue';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    @InjectQueue(PAYMENTS_QUEUE) private readonly paymentsQueue: Queue,
  ) {}

  @Get('saved-card')
  @UseGuards(JwtAuthGuard)
  async getSavedCard(@CurrentUser() user: { id: string }) {
    const card = await this.paymentsService.getSavedCard(user.id);
    return card ?? {};
  }

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

  @Post('remove-payment-method')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  removePaymentMethod(@CurrentUser() user: { id: string }) {
    return this.paymentsService.removePaymentMethod(user.id);
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

    const event = this.paymentsService.constructWebhookEvent(rawBody, signature);

    await this.paymentsQueue.add(WEBHOOK_JOB, { event }, {
      jobId: event.id,
      attempts: 5,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });

    return { received: true };
  }
}
