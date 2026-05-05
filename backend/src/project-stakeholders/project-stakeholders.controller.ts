import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IdParamDto } from '../common/dto/id-param.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateProjectStakeholderDto } from './dto/create-project-stakeholder.dto';
import { UpdateProjectStakeholderDto } from './dto/update-project-stakeholder.dto';
import { ProjectStakeholdersTotalService } from './project-stakeholders-total.service';
import { ProjectStakeholdersService } from './project-stakeholders.service';

@Controller('project-stakeholders')
export class ProjectStakeholdersController {
  constructor(
    private readonly projectStakeholdersService: ProjectStakeholdersService,
    private readonly projectStakeholdersTotalService: ProjectStakeholdersTotalService,
  ) {}

  @Post()
  create(@Body() dto: CreateProjectStakeholderDto) {
    return this.projectStakeholdersService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.projectStakeholdersService.findAll(query);
  }

  @Post('projects/:id/validate-total')
  validateTotal(@Param() params: IdParamDto) {
    return this.projectStakeholdersTotalService.validateTotal(params.id);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.projectStakeholdersService.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateProjectStakeholderDto) {
    return this.projectStakeholdersService.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.projectStakeholdersService.remove(params.id);
  }
}
