import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const projectInclude = {
  model: true,
  product: true,
  stakeholders: { include: { stakeholder: true } },
  transactions: true,
};

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    return this.prisma.$transaction(async (tx) =>
      tx.project.create({ data: this.toCreateData(dto) }),
    );
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
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.project.findUnique({
        where: { idProject: id },
      });
      if (!current) {
        throw new NotFoundException(`Project ${id} was not found`);
      }

      return tx.project.update({
        where: { idProject: id },
        data: this.toUpdateData(dto),
      });
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.project.delete({ where: { idProject: id } });
  }

  private toCreateData(
    dto: CreateProjectDto,
  ): Prisma.ProjectUncheckedCreateInput {
    return {
      ...dto,
      isActive: dto.isActive ?? false,
      productionCost: dto.productionCost ?? 0,
      adminCost: dto.adminCost ?? 0,
      costAdjustment: dto.costAdjustment ?? 0,
    };
  }

  private toUpdateData(dto: UpdateProjectDto): Prisma.ProjectUncheckedUpdateInput {
    return { ...dto };
  }
}
