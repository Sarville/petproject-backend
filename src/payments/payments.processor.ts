import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import Stripe from 'stripe';
import { PaymentsService } from './payments.service';
import { PAYMENTS_QUEUE, WEBHOOK_JOB } from './payments.queue';

@Processor(PAYMENTS_QUEUE)
export class PaymentsProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentsProcessor.name);

  constructor(private readonly paymentsService: PaymentsService) {
    super();
  }

  async process(job: Job<{ event: Stripe.Event }>): Promise<void> {
    const { event } = job.data;

    this.logger.log(`Processing job ${job.name} | event=${event.type} (${event.id}) | attempt=${job.attemptsMade + 1}`);

    if (job.name !== WEBHOOK_JOB) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return;
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        // Artificial delay to demonstrate async queue processing
        this.logger.log(`Simulating slow processing — waiting 25s for event ${event.id}`);
        await new Promise((resolve) => setTimeout(resolve, 25_000));
        await this.paymentsService.handlePaymentSucceeded(event);
        break;

      case 'payment_intent.payment_failed':
        await this.paymentsService.handlePaymentFailed(event);
        break;

      default:
        this.logger.log(`Unhandled event type in worker: ${event.type}`);
    }

    this.logger.log(`Job completed | event=${event.type} (${event.id})`);
  }
}
