import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';

@Injectable()
export class ModelsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateModelDto) {
    return this.prisma.pricingModel.create({ data: dto });
  }

  findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    return this.prisma.pricingModel.findMany({
      where: query.search ? { name: { contains: query.search } } : undefined,
      orderBy: { idModel: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.pricingModel.findUnique({
      where: { idModel: id },
    });
    if (!record) throw new NotFoundException(`Model ${id} was not found`);
    return record;
  }

  async update(id: number, dto: UpdateModelDto) {
    await this.findOne(id);
    return this.prisma.pricingModel.update({
      where: { idModel: id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.pricingModel.delete({ where: { idModel: id } });
  }
}
