import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { publicProjectBaseSelect } from '../projects/project-public-select';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const productDetailInclude = {
  projects: {
    orderBy: { idProject: 'desc' as const },
    select: publicProjectBaseSelect,
  },
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: this.normalizeProductCreateData(dto),
    });
  }

  findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    return this.prisma.product.findMany({
      where: query.search ? { name: { contains: query.search } } : undefined,
      orderBy: { id: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.product.findUnique({
      where: { id },
      include: productDetailInclude,
    });
    if (!record) throw new NotFoundException(`Product ${id} was not found`);
    return record;
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: this.normalizeProductUpdateData(dto),
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id } });
  }

  private normalizeProductCreateData(
    dto: CreateProductDto,
  ): Prisma.ProductUncheckedCreateInput {
    const data = this.normalizeProductWriteData(
      dto,
    ) as Prisma.ProductUncheckedCreateInput;

    if (data.ownership === undefined) {
      data.ownership = 0;
    }

    return data;
  }

  private normalizeProductUpdateData(
    dto: UpdateProductDto,
  ): Prisma.ProductUncheckedUpdateInput {
    return this.normalizeProductWriteData(
      dto,
    ) as Prisma.ProductUncheckedUpdateInput;
  }

  private normalizeProductWriteData(dto: CreateProductDto | UpdateProductDto) {
    const data = { ...dto };

    if (typeof data.name === 'string') {
      data.name = data.name.trim();
    }

    this.normalizeOptionalString(data, 'description');
    this.normalizeOptionalString(data, 'image');
    this.normalizeOptionalString(data, 'idEcommerce');
    this.normalizeOptionalString(data, 'idStore');
    this.normalizeOptionalString(data, 'idEvent');
    this.normalizeOptionalString(data, 'idSurface');
    this.normalizeOptionalString(data, 'tag');

    return data;
  }

  private normalizeOptionalString<T extends Record<string, unknown>>(
    data: T,
    field: keyof T,
  ) {
    if (typeof data[field] !== 'string') {
      return;
    }

    data[field] = data[field].trim() as T[keyof T];
  }
}
