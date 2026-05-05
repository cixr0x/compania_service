import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStakeholderDto } from './dto/create-stakeholder.dto';
import { UpdateStakeholderDto } from './dto/update-stakeholder.dto';

@Injectable()
export class StakeholdersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateStakeholderDto) {
    return this.prisma.stakeholder.create({ data: dto });
  }

  findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    return this.prisma.stakeholder.findMany({
      where: query.search ? { name: { contains: query.search } } : undefined,
      orderBy: { idStakeholder: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.stakeholder.findUnique({ where: { idStakeholder: id } });
    if (!record) throw new NotFoundException(`Stakeholder ${id} was not found`);
    return record;
  }

  async update(id: number, dto: UpdateStakeholderDto) {
    await this.findOne(id);
    return this.prisma.stakeholder.update({ where: { idStakeholder: id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.stakeholder.delete({ where: { idStakeholder: id } });
  }
}
