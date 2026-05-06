import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateSettingDto) {
    return this.prisma.setting.create({ data: dto });
  }

  findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    return this.prisma.setting.findMany({
      where: query.search
        ? {
            OR: [
              { code: { contains: query.search } },
              { name: { contains: query.search } },
            ],
          }
        : undefined,
      orderBy: { id: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.setting.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Setting ${id} was not found`);
    return record;
  }

  async update(id: number, dto: UpdateSettingDto) {
    await this.findOne(id);
    return this.prisma.setting.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.setting.delete({ where: { id } });
  }
}
