import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionStatus } from '@prisma/client';

const AMOUNT_CENTS = 10000; // $100.00

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set');
    this.stripe = new Stripe(secretKey, { apiVersion: '2026-02-25.clover' });
  }

  async getSavedCard(userId: string): Promise<{ brand: string; last4: string } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripePaymentMethodId: true },
    });
    if (!user?.stripePaymentMethodId) return null;
    try {
      const pm = await this.stripe.paymentMethods.retrieve(user.stripePaymentMethodId);
      if (pm.card) return { brand: pm.card.brand, last4: pm.card.last4 };
    } catch (err) {
      this.logger.warn(`Failed to retrieve PM ${user.stripePaymentMethodId}: ${String(err)}`);
    }
    return null;
  }

  async createPaymentIntent(
    userId: string,
    email: string,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      const customerId = await this.getOrCreateCustomer(userId, email);

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { stripePaymentMethodId: true },
      });
      const savedPmId = user?.stripePaymentMethodId ?? null;

      const params: Stripe.PaymentIntentCreateParams = {
        amount: AMOUNT_CENTS,
        currency: 'usd',
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        metadata: { userId },
      };

      if (savedPmId) {
        params.payment_method = savedPmId;
      }

      const paymentIntent = await this.stripe.paymentIntents.create(params);

      await this.prisma.transaction.create({
        data: {
          userId,
          stripePaymentIntentId: paymentIntent.id,
          stripeCustomerId: customerId,
          amount: AMOUNT_CENTS / 100,
          currency: 'usd',
          status: TransactionStatus.PENDING,
        },
      });

      if (!paymentIntent.client_secret) {
        throw new InternalServerErrorException('Stripe did not return client_secret');
      }

      return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
    } catch (err) {
      if (err instanceof Stripe.errors.StripeError) {
        this.logger.error(`Stripe error: ${err.message}`);
        throw new ServiceUnavailableException('Payment service is temporarily unavailable');
      }
      throw err;
    }
  }

  async updateIntentSetup(paymentIntentId: string, saveMethod: boolean): Promise<void> {
    try {
      await this.stripe.paymentIntents.update(paymentIntentId, {
        setup_future_usage: saveMethod ? 'off_session' : '',
      });
    } catch (err) {
      if (err instanceof Stripe.errors.StripeError) {
        this.logger.error(`Stripe error updating intent setup: ${err.message}`);
        throw new ServiceUnavailableException('Payment service is temporarily unavailable');
      }
      throw err;
    }
  }

  async removePaymentMethod(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripePaymentMethodId: true },
    });

    if (!user?.stripePaymentMethodId) return;

    try {
      await this.stripe.paymentMethods.detach(user.stripePaymentMethodId);
    } catch (err) {
      this.logger.warn(`Failed to detach PM ${user.stripePaymentMethodId}: ${String(err)}`);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripePaymentMethodId: null },
    });
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.warn(`Webhook signature verification failed: ${String(err)}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Stripe webhook received: ${event.type} (${event.id})`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event);
        break;
      default:
        // Unhandled event type — acknowledge without action
        break;
    }
  }

  async syncPaymentIntent(paymentIntentId: string): Promise<{ status: string; alreadyProcessed: boolean }> {
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (err) {
      this.logger.error(`Failed to retrieve PaymentIntent ${paymentIntentId}: ${String(err)}`);
      throw new ServiceUnavailableException('Could not retrieve payment status from Stripe');
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!transaction) {
      this.logger.warn(`sync-intent: transaction not found for ${paymentIntentId}`);
      return { status: paymentIntent.status, alreadyProcessed: false };
    }

    if (paymentIntent.status === 'succeeded') {
      if (transaction.status === TransactionStatus.SUCCEEDED) {
        return { status: 'succeeded', alreadyProcessed: true };
      }

      const paymentMethodId =
        typeof paymentIntent.payment_method === 'string'
          ? paymentIntent.payment_method
          : paymentIntent.payment_method?.id ?? null;

      const shouldSavePm = paymentIntent.setup_future_usage != null && paymentMethodId != null;

      await this.prisma.$transaction([
        this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: TransactionStatus.SUCCEEDED },
        }),
        this.prisma.user.update({
          where: { id: transaction.userId },
          data: {
            balance: { increment: transaction.amount },
            ...(shouldSavePm ? { stripePaymentMethodId: paymentMethodId } : {}),
          },
        }),
      ]);

      this.logger.log(`sync-intent: balance credited for user=${transaction.userId}`);
      return { status: 'succeeded', alreadyProcessed: false };
    }

    if (paymentIntent.status === 'canceled' && transaction.status === TransactionStatus.PENDING) {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.CANCELED },
      });
    }

    return { status: paymentIntent.status, alreadyProcessed: false };
  }

  private async handlePaymentSucceeded(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    // Idempotency check: if this event was already processed, skip
    const existingByEvent = await this.prisma.transaction.findUnique({
      where: { stripeEventId: event.id },
    });
    if (existingByEvent) {
      this.logger.log(`Duplicate webhook event ${event.id} — skipping`);
      return;
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found for PaymentIntent ${paymentIntent.id}`);
      return;
    }

    // Idempotency check: if already succeeded, skip
    if (transaction.status === TransactionStatus.SUCCEEDED) {
      this.logger.log(`Transaction ${transaction.id} already succeeded — skipping`);
      return;
    }

    const paymentMethodId =
      typeof paymentIntent.payment_method === 'string'
        ? paymentIntent.payment_method
        : paymentIntent.payment_method?.id ?? null;

    // Save PM only when user explicitly requested it via "Save card" checkbox
    const shouldSavePm = paymentIntent.setup_future_usage != null && paymentMethodId != null;

    await this.prisma.$transaction([
      this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.SUCCEEDED,
          stripeEventId: event.id,
        },
      }),
      this.prisma.user.update({
        where: { id: transaction.userId },
        data: {
          balance: { increment: transaction.amount },
          ...(shouldSavePm ? { stripePaymentMethodId: paymentMethodId } : {}),
        },
      }),
    ]);

    this.logger.log(`Balance credited: user=${transaction.userId} amount=${transaction.amount}`);
  }

  private async handlePaymentFailed(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    const transaction = await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found for PaymentIntent ${paymentIntent.id}`);
      return;
    }

    if (transaction.status !== TransactionStatus.PENDING) return;

    const failureReason =
      paymentIntent.last_payment_error?.message ?? 'Payment failed';

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.FAILED,
        stripeEventId: event.id,
        failureReason,
      },
    });

    this.logger.log(`Payment failed: transaction=${transaction.id} reason="${failureReason}"`);
  }

  private async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new InternalServerErrorException('User not found');

    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await this.stripe.customers.create({ email, metadata: { userId } });

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }
}
