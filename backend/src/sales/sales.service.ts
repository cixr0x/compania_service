import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

const saleInclude = {
  product: true,
};

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateSaleDto) {
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
    await this.findOne(id);
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
    return this.normalizeSaleWriteData(dto) as Prisma.SaleUncheckedUpdateInput;
  }

  private normalizeSaleWriteData(dto: CreateSaleDto | UpdateSaleDto) {
    const data: Record<string, unknown> = { ...dto };

    if (typeof data.date === 'string') {
      data.date = new Date(data.date);
    }

    if (typeof data.source === 'string') {
      data.source = data.source.trim();
    }

    return data;
  }
}
