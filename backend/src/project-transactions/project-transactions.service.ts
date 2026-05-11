import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseSaleDate } from '../sales/dto/sale-date-string.validator';
import { ReplaceProjectTransactionDto } from './dto/replace-project-transaction.dto';

const projectTransactionOrder = { idProjectTransaction: 'desc' as const };

type ProjectTransactionWriteClient = {
  $queryRaw: PrismaService['$queryRaw'];
  project: Pick<PrismaService['project'], 'findUnique'>;
  projectTransaction: Pick<
    PrismaService['projectTransaction'],
    'createMany' | 'deleteMany' | 'findMany'
  >;
};

@Injectable()
export class ProjectTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  findByProject(idProject: number) {
    return this.prisma.projectTransaction.findMany({
      orderBy: projectTransactionOrder,
      where: { idProject },
    });
  }

  replaceProjectTransactions(
    idProject: number,
    dto: ReplaceProjectTransactionDto[],
  ) {
    const rows = dto.map((row) => ({
      amount: row.amount,
      date: this.parseTransactionDate(row.date),
      description: row.description.trim(),
      idProject,
    }));

    return this.prisma.$transaction(async (tx) => {
      await this.lockProject(tx, idProject);
      await this.assertProjectExists(tx, idProject);
      await tx.projectTransaction.deleteMany({ where: { idProject } });

      if (rows.length > 0) {
        await tx.projectTransaction.createMany({ data: rows });
      }

      return tx.projectTransaction.findMany({
        orderBy: projectTransactionOrder,
        where: { idProject },
      });
    });
  }

  private async assertProjectExists(
    client: Pick<ProjectTransactionWriteClient, 'project'>,
    idProject: number,
  ) {
    const project = await client.project.findUnique({
      select: { idProject: true },
      where: { idProject },
    });

    if (!project) {
      throw new NotFoundException(`Project ${idProject} was not found`);
    }
  }

  private async lockProject(
    client: Pick<ProjectTransactionWriteClient, '$queryRaw'>,
    idProject: number,
  ) {
    await client.$queryRaw(
      Prisma.sql`SELECT id_project FROM project WHERE id_project = ${idProject} FOR UPDATE`,
    );
  }

  private parseTransactionDate(value: string) {
    const parsedDate = parseSaleDate(value);

    if (!parsedDate) {
      throw new BadRequestException(
        'Transaction date must be a valid calendar date in YYYY-MM-DD format',
      );
    }

    return parsedDate;
  }
}
