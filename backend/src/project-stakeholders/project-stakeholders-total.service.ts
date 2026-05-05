import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectStakeholdersTotalService {
  constructor(private readonly prisma: PrismaService) {}

  async validateTotal(idProject: number) {
    const rows = await this.prisma.projectStakeholder.findMany({
      where: { idProject },
      select: { stakePercentage: true },
    });
    const total = rows.reduce((sum, row) => sum + Number(row.stakePercentage), 0);

    if (Math.round(total * 100) !== 10000) {
      throw new BadRequestException('Project stakeholder total must equal 100');
    }

    return { valid: true };
  }
}
