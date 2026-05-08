import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SaleFeeCalculatorService } from './sale-fee-calculator.service';
import { SalesService } from './sales.service';

@Module({
  controllers: [SalesController],
  providers: [SalesService, SaleFeeCalculatorService],
  exports: [SalesService, SaleFeeCalculatorService],
})
export class SalesModule {}
