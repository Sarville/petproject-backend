import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsProcessor } from './payments.processor';
import { PAYMENTS_QUEUE } from './payments.queue';

@Module({
  imports: [BullModule.registerQueue({ name: PAYMENTS_QUEUE })],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsProcessor],
  exports: [PaymentsService],
})
export class PaymentsModule {}
