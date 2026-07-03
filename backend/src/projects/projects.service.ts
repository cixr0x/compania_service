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
import { publicProjectDetailSelect } from './project-public-select';

type ProjectNameLookupClient = {
  product: {
    findUnique(args: {
      select: { name: true };
      where: { id: number };
    }): Promise<{ name: string } | null>;
  };
};

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    return this.prisma.$transaction(async (tx) => {
      const data = await this.toCreateData(dto, tx);

      return tx.project.create({
        data,
        select: publicProjectDetailSelect,
      });
    });
  }

  findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    return this.prisma.project.findMany({
      orderBy: { idProject: 'desc' },
      select: publicProjectDetailSelect,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.project.findUnique({
      where: { idProject: id },
      select: publicProjectDetailSelect,
    });
    if (!record) throw new NotFoundException(`Project ${id} was not found`);
    return record;
  }

  async update(id: number, dto: UpdateProjectDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.project.findUnique({
        where: { idProject: id },
        select: { idProject: true },
      });
      if (!current) {
        throw new NotFoundException(`Project ${id} was not found`);
      }

      return tx.project.update({
        where: { idProject: id },
        data: this.toUpdateData(dto),
        select: publicProjectDetailSelect,
      });
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.project.delete({
      where: { idProject: id },
      select: publicProjectDetailSelect,
    });
  }

  private async toCreateData(
    dto: CreateProjectDto,
    client: ProjectNameLookupClient,
  ): Promise<Prisma.ProjectUncheckedCreateInput> {
    const { feeModel, feeValue, name, ...rest } = dto;

    return {
      ...rest,
      feeModel: normalizeFeeModel(feeModel),
      feeValue: validateFeeValue(feeValue),
      name: await resolveProjectName(client, dto.idProduct, name),
      units: dto.units ?? 0,
      unitCost: dto.unitCost ?? 0,
      productionCost: dto.productionCost ?? 0,
      adminCost: dto.adminCost ?? 0,
      costAdjustment: dto.costAdjustment ?? 0,
    };
  }

  private toUpdateData(dto: UpdateProjectDto): Prisma.ProjectUncheckedUpdateInput {
    const { feeModel, feeValue, name, ...rest } = dto;
    const data: Prisma.ProjectUncheckedUpdateInput = { ...rest };

    if (feeModel !== undefined) {
      data.feeModel = normalizeFeeModel(feeModel);
    }

    if (feeValue !== undefined) {
      data.feeValue = validateFeeValue(feeValue);
    }

    if (name !== undefined) {
      data.name = normalizeProjectNameForUpdate(name);
    }

    return data;
  }
}

async function resolveProjectName(
  client: ProjectNameLookupClient,
  idProduct: number,
  value: unknown,
) {
  const providedName = normalizeProjectNameForCreate(value);

  if (providedName) {
    return providedName;
  }

  const product = await client.product.findUnique({
    select: { name: true },
    where: { id: idProduct },
  });

  if (!product) {
    throw new NotFoundException(`Product ${idProduct} was not found`);
  }

  return product.name;
}

function normalizeProjectNameForCreate(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('Project name must be a string');
  }

  const projectName = value.trim();
  return projectName === '' ? null : projectName;
}

function normalizeProjectNameForUpdate(value: unknown) {
  if (typeof value !== 'string') {
    throw new BadRequestException('Project name must be a string');
  }

  const projectName = value.trim();
  if (projectName === '') {
    throw new BadRequestException('Project name cannot be blank');
  }

  return projectName;
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
