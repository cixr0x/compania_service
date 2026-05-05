import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectStakeholderDto } from './dto/create-project-stakeholder.dto';
import { UpdateProjectStakeholderDto } from './dto/update-project-stakeholder.dto';

const projectStakeholderInclude = {
  project: true,
  stakeholder: true,
};

@Injectable()
export class ProjectStakeholdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectStakeholderDto) {
    await this.assertProjectTotalDoesNotExceed100(dto.idProject, dto.stakePercentage);
    return this.prisma.projectStakeholder.create({ data: dto });
  }

  findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    return this.prisma.projectStakeholder.findMany({
      include: projectStakeholderInclude,
      orderBy: { idProjectStakeholder: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.projectStakeholder.findUnique({
      where: { idProjectStakeholder: id },
      include: projectStakeholderInclude,
    });
    if (!record) throw new NotFoundException(`Project stakeholder ${id} was not found`);
    return record;
  }

  async update(id: number, dto: UpdateProjectStakeholderDto) {
    const current = await this.findOne(id);
    const destinationProjectId = dto.idProject ?? current.idProject;
    const nextStakePercentage =
      dto.stakePercentage === undefined
        ? Number(current.stakePercentage)
        : dto.stakePercentage;

    await this.assertProjectTotalDoesNotExceed100(
      destinationProjectId,
      nextStakePercentage,
      id,
    );

    return this.prisma.projectStakeholder.update({
      where: { idProjectStakeholder: id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.projectStakeholder.delete({ where: { idProjectStakeholder: id } });
  }

  private async assertProjectTotalDoesNotExceed100(
    idProject: number,
    stakePercentage: number,
    idProjectStakeholderToExclude?: number,
  ) {
    const rows = await this.prisma.projectStakeholder.findMany({
      where: { idProject },
      select: { idProjectStakeholder: true, stakePercentage: true },
    });
    const existingTotal = rows.reduce((sum, row) => {
      if (row.idProjectStakeholder === idProjectStakeholderToExclude) return sum;
      return sum + Number(row.stakePercentage);
    }, 0);
    const nextTotal = existingTotal + stakePercentage;

    if (Math.round(nextTotal * 100) > 10000) {
      throw new BadRequestException('Project stakeholder total cannot exceed 100');
    }
  }
}
