import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectStakeholderDto } from './dto/create-project-stakeholder.dto';
import { UpdateProjectStakeholderDto } from './dto/update-project-stakeholder.dto';

const projectStakeholderInclude = {
  project: true,
  stakeholder: true,
};

type ProjectStakeholderWriteClient = {
  $queryRaw: PrismaService['$queryRaw'];
  projectStakeholder: Pick<
    PrismaService['projectStakeholder'],
    'create' | 'update' | 'findUnique' | 'findMany'
  >;
};

@Injectable()
export class ProjectStakeholdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectStakeholderDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockProjects(tx, [dto.idProject]);
      await this.assertProjectTotalDoesNotExceed100(tx, dto.idProject, dto.stakePercentage);
      return tx.projectStakeholder.create({ data: dto });
    });
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
    return this.prisma.$transaction(async (tx) => {
      await this.lockProjectStakeholder(tx, id);
      const current = await this.findOneWithClient(tx, id);
      const destinationProjectId = dto.idProject ?? current.idProject;

      await this.lockProjects(tx, [current.idProject, destinationProjectId]);
      const nextStakePercentage =
        dto.stakePercentage === undefined
          ? Number(current.stakePercentage)
          : dto.stakePercentage;
      const idProjectStakeholderToExclude =
        current.idProject === destinationProjectId ? id : undefined;

      await this.assertProjectTotalDoesNotExceed100(
        tx,
        destinationProjectId,
        nextStakePercentage,
        idProjectStakeholderToExclude,
      );

      return tx.projectStakeholder.update({
        where: { idProjectStakeholder: id },
        data: dto,
      });
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.projectStakeholder.delete({ where: { idProjectStakeholder: id } });
  }

  private async assertProjectTotalDoesNotExceed100(
    client: Pick<ProjectStakeholderWriteClient, 'projectStakeholder'>,
    idProject: number,
    stakePercentage: number,
    idProjectStakeholderToExclude?: number,
  ) {
    const rows = await client.projectStakeholder.findMany({
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

  private async findOneWithClient(
    client: Pick<ProjectStakeholderWriteClient, 'projectStakeholder'>,
    id: number,
  ) {
    const record = await client.projectStakeholder.findUnique({
      where: { idProjectStakeholder: id },
      include: projectStakeholderInclude,
    });
    if (!record) throw new NotFoundException(`Project stakeholder ${id} was not found`);
    return record;
  }

  private async lockProjectStakeholder(
    client: Pick<ProjectStakeholderWriteClient, '$queryRaw'>,
    idProjectStakeholder: number,
  ) {
    await client.$queryRaw(
      Prisma.sql`SELECT id_project_stakeholder FROM project_stakeholder WHERE id_project_stakeholder = ${idProjectStakeholder} FOR UPDATE`,
    );
  }

  private async lockProjects(
    client: Pick<ProjectStakeholderWriteClient, '$queryRaw'>,
    projectIds: number[],
  ) {
    const uniqueProjectIds = [...new Set(projectIds)].sort((a, b) => a - b);

    for (const idProject of uniqueProjectIds) {
      await client.$queryRaw(
        Prisma.sql`SELECT id_project FROM project WHERE id_project = ${idProject} FOR UPDATE`,
      );
    }
  }
}
