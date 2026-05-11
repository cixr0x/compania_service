import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseSaleDate } from '../sales/dto/sale-date-string.validator';
import { ReplaceStakeholderProjectTransactionDto } from './dto/replace-stakeholder-project-transaction.dto';

const stakeholderProjectTransactionOrder = {
  idStakeholderProjectTransaction: 'desc' as const,
};

type StakeholderProjectTransactionWriteClient = {
  $queryRaw: PrismaService['$queryRaw'];
  projectStakeholder: Pick<PrismaService['projectStakeholder'], 'findUnique'>;
  stakeholderProjectTransaction: Pick<
    PrismaService['stakeholderProjectTransaction'],
    'createMany' | 'deleteMany' | 'findMany'
  >;
};

@Injectable()
export class StakeholderProjectTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  findByProjectStakeholder(idProject: number, idStakeholder: number) {
    return this.prisma.stakeholderProjectTransaction.findMany({
      orderBy: stakeholderProjectTransactionOrder,
      where: { idProject, idStakeholder },
    });
  }

  replaceProjectStakeholderTransactions(
    idProject: number,
    idStakeholder: number,
    dto: ReplaceStakeholderProjectTransactionDto[],
  ) {
    const rows = dto.map((row) => ({
      amount: row.amount,
      date: this.parseTransactionDate(row.date),
      description: row.description.trim(),
      idProject,
      idStakeholder,
    }));

    return this.prisma.$transaction(async (tx) => {
      await this.lockProjectStakeholder(tx, idProject, idStakeholder);
      await this.assertProjectStakeholderExists(tx, idProject, idStakeholder);
      await tx.stakeholderProjectTransaction.deleteMany({
        where: { idProject, idStakeholder },
      });

      if (rows.length > 0) {
        await tx.stakeholderProjectTransaction.createMany({ data: rows });
      }

      return tx.stakeholderProjectTransaction.findMany({
        orderBy: stakeholderProjectTransactionOrder,
        where: { idProject, idStakeholder },
      });
    });
  }

  private async assertProjectStakeholderExists(
    client: Pick<
      StakeholderProjectTransactionWriteClient,
      'projectStakeholder'
    >,
    idProject: number,
    idStakeholder: number,
  ) {
    const projectStakeholder = await client.projectStakeholder.findUnique({
      select: { idProjectStakeholder: true },
      where: { idProject_idStakeholder: { idProject, idStakeholder } },
    });

    if (!projectStakeholder) {
      throw new NotFoundException(
        `Stakeholder ${idStakeholder} is not assigned to project ${idProject}`,
      );
    }
  }

  private async lockProjectStakeholder(
    client: Pick<StakeholderProjectTransactionWriteClient, '$queryRaw'>,
    idProject: number,
    idStakeholder: number,
  ) {
    await client.$queryRaw(
      Prisma.sql`SELECT id_project_stakeholder FROM project_stakeholder WHERE id_project = ${idProject} AND id_stakeholder = ${idStakeholder} FOR UPDATE`,
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
