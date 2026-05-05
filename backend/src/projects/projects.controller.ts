import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IdParamDto } from '../common/dto/id-param.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.projectsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.projectsService.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.projectsService.remove(params.id);
  }
}
