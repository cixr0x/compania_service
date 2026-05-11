import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectStakeholderDto } from './dto/create-project-stakeholder.dto';
import { ReplaceProjectStakeholderDto } from './dto/replace-project-stakeholder.dto';
import { UpdateProjectStakeholderDto } from './dto/update-project-stakeholder.dto';

const projectStakeholderInclude = {
  project: { include: { product: true } },
  stakeholder: true,
};

type ProjectStakeholderWriteClient = {
  $queryRaw: PrismaService['$queryRaw'];
  projectStakeholder: Pick<
    PrismaService['projectStakeholder'],
    | 'create'
    | 'createMany'
    | 'delete'
    | 'deleteMany'
    | 'update'
    | 'findUnique'
    | 'findMany'
  >;
};

@Injectable()
export class ProjectStakeholdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectStakeholderDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockProjects(tx, [dto.idProject]);
      await this.assertProjectTotalEquals100(
        tx,
        dto.idProject,
        dto.stakePercentage,
      );
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

  findByProject(idProject: number) {
    return this.prisma.projectStakeholder.findMany({
      where: { idProject },
      include: projectStakeholderInclude,
      orderBy: { idProjectStakeholder: 'desc' },
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.projectStakeholder.findUnique({
      where: { idProjectStakeholder: id },
      include: projectStakeholderInclude,
    });
    if (!record)
      throw new NotFoundException(`Project stakeholder ${id} was not found`);
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

      if (current.idProject !== destinationProjectId) {
        await this.assertProjectTotalEquals100(tx, current.idProject, 0, id);
      }

      await this.assertProjectTotalEquals100(
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
    return this.prisma.$transaction(async (tx) => {
      await this.lockProjectStakeholder(tx, id);
      const current = await this.findOneWithClient(tx, id);
      await this.lockProjects(tx, [current.idProject]);
      await this.assertProjectTotalEquals100(tx, current.idProject, 0, id);
      return tx.projectStakeholder.delete({
        where: { idProjectStakeholder: id },
      });
    });
  }

  async replaceProjectSplit(
    idProject: number,
    dto: ReplaceProjectStakeholderDto[],
  ) {
    this.assertSubmittedProjectTotalEquals100(dto);
    this.assertStakeholdersAreUnique(dto);

    return this.prisma.$transaction(async (tx) => {
      await this.lockProjects(tx, [idProject]);
      await tx.projectStakeholder.deleteMany({ where: { idProject } });
      if (dto.length > 0) {
        await tx.projectStakeholder.createMany({
          data: dto.map((row) => ({
            idProject,
            idStakeholder: row.idStakeholder,
            stakePercentage: row.stakePercentage,
          })),
        });
      }

      return tx.projectStakeholder.findMany({
        where: { idProject },
        include: projectStakeholderInclude,
        orderBy: { idProjectStakeholder: 'desc' },
      });
    });
  }

  private async assertProjectTotalEquals100(
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
      if (row.idProjectStakeholder === idProjectStakeholderToExclude)
        return sum;
      return sum + Number(row.stakePercentage);
    }, 0);
    const nextTotalCents =
      toPercentageCents(existingTotal) + toPercentageCents(stakePercentage);

    if (nextTotalCents !== 10000) {
      throw new BadRequestException('Project stakeholder total must equal 100');
    }
  }

  private assertSubmittedProjectTotalEquals100(
    dto: ReplaceProjectStakeholderDto[],
  ) {
    if (dto.length === 0) {
      return;
    }

    const totalCents = dto.reduce(
      (sum, row) => sum + toPercentageCents(row.stakePercentage),
      0,
    );

    if (totalCents !== 10000) {
      throw new BadRequestException('Project stakeholder total must equal 100');
    }
  }

  private assertStakeholdersAreUnique(dto: ReplaceProjectStakeholderDto[]) {
    const stakeholderIds = new Set<number>();

    for (const row of dto) {
      if (stakeholderIds.has(row.idStakeholder)) {
        throw new BadRequestException(
          'Project split cannot contain duplicate stakeholders',
        );
      }
      stakeholderIds.add(row.idStakeholder);
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
    if (!record)
      throw new NotFoundException(`Project stakeholder ${id} was not found`);
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

function toPercentageCents(value: number | string | Prisma.Decimal): number {
  return Math.round(Number(value) * 100);
}
