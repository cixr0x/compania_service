import { Module } from '@nestjs/common';
import { StakeholderProjectTransactionsController } from './stakeholder-project-transactions.controller';
import { StakeholderProjectTransactionsService } from './stakeholder-project-transactions.service';

@Module({
  controllers: [StakeholderProjectTransactionsController],
  providers: [StakeholderProjectTransactionsService],
  exports: [StakeholderProjectTransactionsService],
})
export class StakeholderProjectTransactionsModule {}
