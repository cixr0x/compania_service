import {
  Body,
  Controller,
  Get,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { ReplaceStakeholderProjectTransactionDto } from './dto/replace-stakeholder-project-transaction.dto';
import { StakeholderProjectTransactionsService } from './stakeholder-project-transactions.service';

@Controller('stakeholder-project-transactions')
export class StakeholderProjectTransactionsController {
  constructor(
    private readonly stakeholderProjectTransactionsService: StakeholderProjectTransactionsService,
  ) {}

  @Get('projects/:projectId/stakeholders/:stakeholderId')
  findByProjectStakeholder(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('stakeholderId', ParseIntPipe) stakeholderId: number,
  ) {
    return this.stakeholderProjectTransactionsService.findByProjectStakeholder(
      projectId,
      stakeholderId,
    );
  }

  @Put('projects/:projectId/stakeholders/:stakeholderId')
  replaceProjectStakeholderTransactions(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('stakeholderId', ParseIntPipe) stakeholderId: number,
    @Body(new ParseArrayPipe({ items: ReplaceStakeholderProjectTransactionDto }))
    dto: ReplaceStakeholderProjectTransactionDto[],
  ) {
    return this.stakeholderProjectTransactionsService.replaceProjectStakeholderTransactions(
      projectId,
      stakeholderId,
      dto,
    );
  }
}
