import { Controller, Get, Param, Query } from '@nestjs/common';
import { IdParamDto } from '../common/dto/id-param.dto';
import { SalesSummaryQueryDto } from './dto/sales-summary-query.dto';
import { StakeholderProjectReportQueryDto } from './dto/stakeholder-project-report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-summary/periods')
  findSalesSummaryPeriods() {
    return this.reportsService.findSalesSummaryPeriods();
  }

  @Get('sales-summary')
  getSalesSummary(@Query() query: SalesSummaryQueryDto) {
    return this.reportsService.getSalesSummary(query);
  }

  @Get('stakeholder-projects')
  getStakeholderProjectsReport(
    @Query() query: StakeholderProjectReportQueryDto,
  ) {
    return this.reportsService.getStakeholderProjectsReport(query);
  }

  @Get('stakeholder-projects/stakeholders')
  findStakeholderProjectCounts() {
    return this.reportsService.findStakeholderProjectCounts();
  }

  @Get('stakeholder-projects/stakeholders/:id')
  findProjectsForStakeholder(@Param() { id }: IdParamDto) {
    return this.reportsService.findProjectsForStakeholder(id);
  }
}
