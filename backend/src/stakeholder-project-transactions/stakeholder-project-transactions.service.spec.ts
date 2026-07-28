import { NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { StakeholderProjectTransactionsService } from './stakeholder-project-transactions.service';
import {
  asPrismaService,
  asPrismaTransactionClient,
} from '../../test/prisma-service.mock';

type AsyncMock = (args: unknown) => Promise<unknown>;
type TransactionMock = (
  callback: (client: Prisma.TransactionClient) => Promise<unknown>,
) => Promise<unknown>;

describe('StakeholderProjectTransactionsService', () => {
  const transactionPrisma = {
    $queryRaw: jest.fn<AsyncMock>(),
    projectStakeholder: {
      findUnique: jest.fn<AsyncMock>(),
    },
    stakeholderProjectTransaction: {
      createMany: jest.fn<AsyncMock>(),
      deleteMany: jest.fn<AsyncMock>(),
      findMany: jest.fn<AsyncMock>(),
    },
  };
  const prisma = {
    $transaction: jest.fn<TransactionMock>(),
    stakeholderProjectTransaction: {
      findMany: jest.fn<AsyncMock>(),
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: Parameters<TransactionMock>[0]) =>
        callback(asPrismaTransactionClient(transactionPrisma)),
    );
  });

  it('lists stakeholder project transactions ordered by date ascending', async () => {
    prisma.stakeholderProjectTransaction.findMany.mockResolvedValue([
      {
        amount: '125.50',
        date: new Date('2026-05-05T00:00:00.000Z'),
        description: 'Distribution',
        idProject: 501,
        idStakeholder: 10,
        idStakeholderProjectTransaction: 2,
        transactionType: 'payment',
      },
    ]);

    const service = new StakeholderProjectTransactionsService(
      asPrismaService(prisma),
    );
    await service.findByProjectStakeholder(501, 10);

    expect(prisma.stakeholderProjectTransaction.findMany).toHaveBeenCalledWith({
      orderBy: [{ date: 'asc' }, { idStakeholderProjectTransaction: 'asc' }],
      where: { idProject: 501, idStakeholder: 10 },
    });
  });

  it('replaces all stakeholder project transactions atomically', async () => {
    transactionPrisma.projectStakeholder.findUnique.mockResolvedValue({
      idProjectStakeholder: 900,
    });
    transactionPrisma.stakeholderProjectTransaction.deleteMany.mockResolvedValue(
      { count: 2 },
    );
    transactionPrisma.stakeholderProjectTransaction.createMany.mockResolvedValue(
      { count: 2 },
    );
    transactionPrisma.stakeholderProjectTransaction.findMany.mockResolvedValue([
      {
        amount: '100.00',
        date: new Date('2026-05-05T00:00:00.000Z'),
        description: 'Distribution',
        idProject: 501,
        idStakeholder: 10,
        idStakeholderProjectTransaction: 10,
        transactionType: 'payment',
      },
      {
        amount: '-15.00',
        date: new Date('2026-05-06T00:00:00.000Z'),
        description: 'Correction',
        idProject: 501,
        idStakeholder: 10,
        idStakeholderProjectTransaction: 11,
        transactionType: 'adjustment',
      },
    ]);

    const service = new StakeholderProjectTransactionsService(
      asPrismaService(prisma),
    );
    const result = await service.replaceProjectStakeholderTransactions(
      501,
      10,
      [
        {
          amount: 100,
          date: '2026-05-05',
          description: 'Distribution',
          transactionType: 'payment',
        },
        {
          amount: -15,
          date: '2026-05-06',
          description: 'Correction',
          transactionType: 'adjustment',
        },
      ],
    );

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(transactionPrisma.$queryRaw).toHaveBeenCalled();
    expect(
      transactionPrisma.projectStakeholder.findUnique,
    ).toHaveBeenCalledWith({
      select: { idProjectStakeholder: true },
      where: { idProject_idStakeholder: { idProject: 501, idStakeholder: 10 } },
    });
    expect(
      transactionPrisma.stakeholderProjectTransaction.deleteMany,
    ).toHaveBeenCalledWith({
      where: { idProject: 501, idStakeholder: 10 },
    });
    expect(
      transactionPrisma.stakeholderProjectTransaction.createMany,
    ).toHaveBeenCalledWith({
      data: [
        {
          amount: 100,
          date: new Date('2026-05-05T00:00:00.000Z'),
          description: 'Distribution',
          idProject: 501,
          idStakeholder: 10,
          transactionType: 'payment',
        },
        {
          amount: -15,
          date: new Date('2026-05-06T00:00:00.000Z'),
          description: 'Correction',
          idProject: 501,
          idStakeholder: 10,
          transactionType: 'adjustment',
        },
      ],
    });
    expect(
      transactionPrisma.stakeholderProjectTransaction.findMany,
    ).toHaveBeenCalledWith({
      orderBy: [{ date: 'asc' }, { idStakeholderProjectTransaction: 'asc' }],
      where: { idProject: 501, idStakeholder: 10 },
    });
    expect(result).toEqual([
      {
        amount: '100.00',
        date: new Date('2026-05-05T00:00:00.000Z'),
        description: 'Distribution',
        idProject: 501,
        idStakeholder: 10,
        idStakeholderProjectTransaction: 10,
        transactionType: 'payment',
      },
      {
        amount: '-15.00',
        date: new Date('2026-05-06T00:00:00.000Z'),
        description: 'Correction',
        idProject: 501,
        idStakeholder: 10,
        idStakeholderProjectTransaction: 11,
        transactionType: 'adjustment',
      },
    ]);
  });

  it('deletes all transactions when replacement payload is empty', async () => {
    transactionPrisma.projectStakeholder.findUnique.mockResolvedValue({
      idProjectStakeholder: 900,
    });
    transactionPrisma.stakeholderProjectTransaction.deleteMany.mockResolvedValue(
      { count: 2 },
    );
    transactionPrisma.stakeholderProjectTransaction.findMany.mockResolvedValue(
      [],
    );

    const service = new StakeholderProjectTransactionsService(
      asPrismaService(prisma),
    );
    await service.replaceProjectStakeholderTransactions(501, 10, []);

    expect(
      transactionPrisma.stakeholderProjectTransaction.deleteMany,
    ).toHaveBeenCalledWith({
      where: { idProject: 501, idStakeholder: 10 },
    });
    expect(
      transactionPrisma.stakeholderProjectTransaction.createMany,
    ).not.toHaveBeenCalled();
  });

  it('rejects replacements when the stakeholder is not assigned to the project', async () => {
    transactionPrisma.projectStakeholder.findUnique.mockResolvedValue(null);

    const service = new StakeholderProjectTransactionsService(
      asPrismaService(prisma),
    );

    await expect(
      service.replaceProjectStakeholderTransactions(501, 10, []),
    ).rejects.toThrow(
      new NotFoundException('Stakeholder 10 is not assigned to project 501'),
    );
    expect(
      transactionPrisma.stakeholderProjectTransaction.deleteMany,
    ).not.toHaveBeenCalled();
  });
});
