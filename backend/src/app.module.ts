import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImportBatchesModule } from './import-batches/import-batches.module';
import { ModelsModule } from './models/models.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectStakeholdersModule } from './project-stakeholders/project-stakeholders.module';
import { ProjectsModule } from './projects/projects.module';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';
import { SalesModule } from './sales/sales.module';
import { SettingsModule } from './settings/settings.module';
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
    SalesModule,
    SettingsModule,
    ImportBatchesModule,
    ReportsModule,
  ],
})
export class AppModule {}
