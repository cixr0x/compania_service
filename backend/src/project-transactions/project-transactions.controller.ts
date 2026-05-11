import { Body, Controller, Get, Param, ParseArrayPipe, Put } from '@nestjs/common';
import { IdParamDto } from '../common/dto/id-param.dto';
import { ReplaceProjectTransactionDto } from './dto/replace-project-transaction.dto';
import { ProjectTransactionsService } from './project-transactions.service';

@Controller('project-transactions')
export class ProjectTransactionsController {
  constructor(
    private readonly projectTransactionsService: ProjectTransactionsService,
  ) {}

  @Get('projects/:id')
  findByProject(@Param() params: IdParamDto) {
    return this.projectTransactionsService.findByProject(params.id);
  }

  @Put('projects/:id')
  replaceProjectTransactions(
    @Param() params: IdParamDto,
    @Body(new ParseArrayPipe({ items: ReplaceProjectTransactionDto }))
    dto: ReplaceProjectTransactionDto[],
  ) {
    return this.projectTransactionsService.replaceProjectTransactions(
      params.id,
      dto,
    );
  }
}
