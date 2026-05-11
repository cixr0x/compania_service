import { Module } from '@nestjs/common';
import { ProjectTransactionsController } from './project-transactions.controller';
import { ProjectTransactionsService } from './project-transactions.service';

@Module({
  controllers: [ProjectTransactionsController],
  providers: [ProjectTransactionsService],
  exports: [ProjectTransactionsService],
})
export class ProjectTransactionsModule {}
