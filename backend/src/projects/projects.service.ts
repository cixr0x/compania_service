import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const projectInclude = {
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
    const { feeModel, feeValue, ...rest } = dto;

    return {
      ...rest,
      feeModel: normalizeFeeModel(feeModel),
      feeValue: validateFeeValue(feeValue),
      units: dto.units ?? 0,
      unitCost: dto.unitCost ?? 0,
      productionCost: dto.productionCost ?? 0,
      adminCost: dto.adminCost ?? 0,
      costAdjustment: dto.costAdjustment ?? 0,
    };
  }

  private toUpdateData(dto: UpdateProjectDto): Prisma.ProjectUncheckedUpdateInput {
    const { feeModel, feeValue, ...rest } = dto;
    const data: Prisma.ProjectUncheckedUpdateInput = { ...rest };

    if (feeModel !== undefined) {
      data.feeModel = normalizeFeeModel(feeModel);
    }

    if (feeValue !== undefined) {
      data.feeValue = validateFeeValue(feeValue);
    }

    return data;
  }
}

function normalizeFeeModel(value: string) {
  const feeModel = value.trim().toLowerCase();

  if (feeModel !== 'percentage' && feeModel !== 'fixed') {
    throw new BadRequestException(`Unsupported project fee model ${feeModel}`);
  }

  return feeModel;
}

function validateFeeValue(value: number) {
  if (!Number.isFinite(value)) {
    throw new BadRequestException('Project fee value must be a finite number');
  }

  return value;
}
