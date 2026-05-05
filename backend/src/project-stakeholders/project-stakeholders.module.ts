import { Module } from '@nestjs/common';
import { ProjectStakeholdersTotalService } from './project-stakeholders-total.service';
import { ProjectStakeholdersController } from './project-stakeholders.controller';
import { ProjectStakeholdersService } from './project-stakeholders.service';

@Module({
  controllers: [ProjectStakeholdersController],
  providers: [ProjectStakeholdersService, ProjectStakeholdersTotalService],
  exports: [ProjectStakeholdersService, ProjectStakeholdersTotalService],
})
export class ProjectStakeholdersModule {}
