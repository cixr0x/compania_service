import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { ImportBatchesModule } from './import-batches/import-batches.module';
import { ModelsModule } from './models/models.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectStakeholdersModule } from './project-stakeholders/project-stakeholders.module';
import { ProjectTransactionsModule } from './project-transactions/project-transactions.module';
import { ProjectsModule } from './projects/projects.module';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';
import { SalesModule } from './sales/sales.module';
import { SettingsModule } from './settings/settings.module';
import { StakeholderProjectTransactionsModule } from './stakeholder-project-transactions/stakeholder-project-transactions.module';
import { StakeholdersModule } from './stakeholders/stakeholders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ModelsModule,
    ProductsModule,
    StakeholdersModule,
    ProjectsModule,
    ProjectStakeholdersModule,
    ProjectTransactionsModule,
    SalesModule,
    SettingsModule,
    StakeholderProjectTransactionsModule,
    ImportBatchesModule,
    ReportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
