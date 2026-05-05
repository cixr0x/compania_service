import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const projectInclude = {
  product: true,
  stakeholders: { include: { stakeholder: true } },
};

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProjectDto) {
    return this.prisma.project.create({ data: dto });
  }

  findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    return this.prisma.project.findMany({
      include: projectInclude,
      orderBy: { idProject: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.project.findUnique({
      where: { idProject: id },
      include: projectInclude,
    });
    if (!record) throw new NotFoundException(`Project ${id} was not found`);
    return record;
  }

  async update(id: number, dto: UpdateProjectDto) {
    await this.findOne(id);
    return this.prisma.project.update({
      where: { idProject: id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.project.delete({ where: { idProject: id } });
  }
}
