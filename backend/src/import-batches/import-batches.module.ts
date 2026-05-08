import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SalesModule } from '../sales/sales.module';
import { ImportBatchesController } from './import-batches.controller';
import { ImportBatchesService } from './import-batches.service';
import { ImportParserService } from './import-parser.service';
import { ImportValidatorService } from './import-validator.service';

@Module({
  imports: [PrismaModule, SalesModule],
  controllers: [ImportBatchesController],
  providers: [
    ImportBatchesService,
    ImportParserService,
    ImportValidatorService,
  ],
})
export class ImportBatchesModule {}
