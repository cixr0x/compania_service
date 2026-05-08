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
};
type ProjectWriteClient = Pick<Prisma.TransactionClient, 'project'>;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.isActive) {
          await this.assertProductHasNoOtherActiveProject(tx, dto.idProduct);
        }

        return tx.project.create({ data: this.toCreateData(dto) });
      });
    } catch (error) {
      this.throwIfActiveProjectConflict(error, dto.idProduct);
      throw error;
    }
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
    let nextProductId: number | undefined;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await tx.project.findUnique({
          where: { idProject: id },
        });
        if (!current) {
          throw new NotFoundException(`Project ${id} was not found`);
        }

        nextProductId = dto.idProduct ?? current.idProduct;
        const nextIsActive = dto.isActive ?? current.isActive;
        if (nextIsActive) {
          await this.assertProductHasNoOtherActiveProject(
            tx,
            nextProductId,
            id,
          );
        }

        return tx.project.update({
          where: { idProject: id },
          data: this.toUpdateData(dto, nextProductId, nextIsActive),
        });
      });
    } catch (error) {
      this.throwIfActiveProjectConflict(error, nextProductId);
      throw error;
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.project.delete({ where: { idProject: id } });
  }

  private async assertProductHasNoOtherActiveProject(
    client: ProjectWriteClient,
    idProduct: number,
    excludingProjectId?: number,
  ) {
    const existing = await client.project.findFirst({
      where: {
        idProduct,
        isActive: true,
        ...(excludingProjectId
          ? { idProject: { not: excludingProjectId } }
          : {}),
      },
      select: { idProject: true },
    });

    if (existing) {
      throw new BadRequestException(
        `Product ${idProduct} already has an active project`,
      );
    }
  }

  private toCreateData(
    dto: CreateProjectDto,
  ): Prisma.ProjectUncheckedCreateInput {
    return {
      ...dto,
      isActive: dto.isActive ?? false,
      costAdjustment: dto.costAdjustment ?? 0,
      activeProductId: dto.isActive ? dto.idProduct : null,
    };
  }

  private toUpdateData(
    dto: UpdateProjectDto,
    idProduct: number,
    isActive: boolean,
  ): Prisma.ProjectUncheckedUpdateInput {
    return {
      ...dto,
      activeProductId: isActive ? idProduct : null,
    };
  }

  private throwIfActiveProjectConflict(
    error: unknown,
    idProduct: number | undefined,
  ): never | void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException(
        idProduct
          ? `Product ${idProduct} already has an active project`
          : 'Product already has an active project',
      );
    }
  }
}
