import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SaleFeeCalculatorService } from './sale-fee-calculator.service';
import { SaleFinancialsCalculatorService } from './sale-financials-calculator.service';
import { SalesService } from './sales.service';

@Module({
  controllers: [SalesController],
  providers: [
    SalesService,
    SaleFeeCalculatorService,
    SaleFinancialsCalculatorService,
  ],
  exports: [
    SalesService,
    SaleFeeCalculatorService,
    SaleFinancialsCalculatorService,
  ],
})
export class SalesModule {}
