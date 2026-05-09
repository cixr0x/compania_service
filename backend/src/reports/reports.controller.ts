import { Controller, Get, Query } from '@nestjs/common';
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
  getStakeholderProjectsReport(@Query() query: StakeholderProjectReportQueryDto) {
    return this.reportsService.getStakeholderProjectsReport(query);
  }
}
