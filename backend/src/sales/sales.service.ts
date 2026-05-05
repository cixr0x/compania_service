import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { parseSaleDate } from './dto/sale-date-string.validator';
import { UpdateSaleDto } from './dto/update-sale.dto';

const saleInclude = {
  product: true,
  project: true,
};

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSaleDto) {
    await this.ensureProductExists(dto.idProduct);
    await this.ensureProjectBelongsToProduct(dto.idProject, dto.idProduct);
    return this.prisma.sale.create({
      data: this.normalizeSaleCreateData(dto),
    });
  }

  findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    return this.prisma.sale.findMany({
      include: saleInclude,
      orderBy: { idSale: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.sale.findUnique({
      where: { idSale: id },
      include: saleInclude,
    });
    if (!record) throw new NotFoundException(`Sale ${id} was not found`);
    return record;
  }

  async update(id: number, dto: UpdateSaleDto) {
    const current = await this.findOne(id);
    if (dto.idProduct !== undefined) {
      await this.ensureProductExists(dto.idProduct);
    }
    if (dto.idProject !== undefined || dto.idProduct !== undefined) {
      await this.ensureProjectBelongsToProduct(
        dto.idProject ?? current.idProject,
        dto.idProduct ?? current.idProduct,
      );
    }
    return this.prisma.sale.update({
      where: { idSale: id },
      data: this.normalizeSaleUpdateData(dto),
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.sale.delete({ where: { idSale: id } });
  }

  private normalizeSaleCreateData(
    dto: CreateSaleDto,
  ): Prisma.SaleUncheckedCreateInput {
    return {
      ...this.normalizeSaleWriteData(dto),
      fee: dto.fee ?? 0,
    } as Prisma.SaleUncheckedCreateInput;
  }

  private normalizeSaleUpdateData(
    dto: UpdateSaleDto,
  ): Prisma.SaleUncheckedUpdateInput {
    return this.normalizeSaleWriteData(dto);
  }

  private normalizeSaleWriteData(dto: CreateSaleDto | UpdateSaleDto) {
    const data: Record<string, unknown> = { ...dto };

    if (typeof data.date === 'string') {
      const parsedDate = parseSaleDate(data.date);
      if (!parsedDate) {
        throw new BadRequestException(
          'Date must be a valid calendar date in YYYY-MM-DD format',
        );
      }
      data.date = parsedDate;
    }

    if (typeof data.source === 'string') {
      data.source = data.source.trim();
      if (data.source === '') {
        throw new BadRequestException('Source cannot be blank');
      }
    }

    return data;
  }

  private async ensureProductExists(idProduct: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: idProduct },
      select: { id: true },
    });
    if (!product) {
      throw new BadRequestException(`Product ${idProduct} was not found`);
    }
  }

  private async ensureProjectBelongsToProduct(
    idProject: number,
    idProduct: number,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { idProject },
      select: { idProject: true, idProduct: true },
    });

    if (!project) {
      throw new BadRequestException(`Project ${idProject} was not found`);
    }

    if (project.idProduct !== idProduct) {
      throw new BadRequestException(
        `Project ${idProject} does not belong to product ${idProduct}`,
      );
    }
  }
}
