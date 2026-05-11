import { NotFoundException } from '@nestjs/common';
import { StakeholderProjectTransactionsService } from './stakeholder-project-transactions.service';

describe('StakeholderProjectTransactionsService', () => {
  const transactionPrisma = {
    $queryRaw: jest.fn(),
    projectStakeholder: {
      findUnique: jest.fn(),
    },
    stakeholderProjectTransaction: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;
  const prisma = {
    $transaction: jest.fn((callback) => callback(transactionPrisma)),
    stakeholderProjectTransaction: {
      findMany: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback) =>
      callback(transactionPrisma),
    );
  });

  it('lists stakeholder project transactions ordered newest first', async () => {
    jest
      .spyOn(prisma.stakeholderProjectTransaction, 'findMany')
      .mockResolvedValue([
        {
          amount: '125.50',
          date: new Date('2026-05-05T00:00:00.000Z'),
          description: 'Distribution',
          idProject: 501,
          idStakeholder: 10,
          idStakeholderProjectTransaction: 2,
        },
      ]);

    const service = new StakeholderProjectTransactionsService(prisma);
    await service.findByProjectStakeholder(501, 10);

    expect(
      prisma.stakeholderProjectTransaction.findMany,
    ).toHaveBeenCalledWith({
      orderBy: { idStakeholderProjectTransaction: 'desc' },
      where: { idProject: 501, idStakeholder: 10 },
    });
  });

  it('replaces all stakeholder project transactions atomically', async () => {
    jest.spyOn(transactionPrisma.projectStakeholder, 'findUnique').mockResolvedValue({
      idProjectStakeholder: 900,
    });
    jest
      .spyOn(transactionPrisma.stakeholderProjectTransaction, 'deleteMany')
      .mockResolvedValue({ count: 2 });
    jest
      .spyOn(transactionPrisma.stakeholderProjectTransaction, 'createMany')
      .mockResolvedValue({ count: 2 });
    jest
      .spyOn(transactionPrisma.stakeholderProjectTransaction, 'findMany')
      .mockResolvedValue([
        {
          amount: '100.00',
          date: new Date('2026-05-05T00:00:00.000Z'),
          description: 'Distribution',
          idProject: 501,
          idStakeholder: 10,
          idStakeholderProjectTransaction: 10,
        },
        {
          amount: '-15.00',
          date: new Date('2026-05-06T00:00:00.000Z'),
          description: 'Correction',
          idProject: 501,
          idStakeholder: 10,
          idStakeholderProjectTransaction: 11,
        },
      ]);

    const service = new StakeholderProjectTransactionsService(prisma);
    const result = await service.replaceProjectStakeholderTransactions(501, 10, [
      { amount: 100, date: '2026-05-05', description: 'Distribution' },
      { amount: -15, date: '2026-05-06', description: 'Correction' },
    ]);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(transactionPrisma.$queryRaw).toHaveBeenCalled();
    expect(transactionPrisma.projectStakeholder.findUnique).toHaveBeenCalledWith({
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
        },
        {
          amount: -15,
          date: new Date('2026-05-06T00:00:00.000Z'),
          description: 'Correction',
          idProject: 501,
          idStakeholder: 10,
        },
      ],
    });
    expect(result).toEqual([
      {
        amount: '100.00',
        date: new Date('2026-05-05T00:00:00.000Z'),
        description: 'Distribution',
        idProject: 501,
        idStakeholder: 10,
        idStakeholderProjectTransaction: 10,
      },
      {
        amount: '-15.00',
        date: new Date('2026-05-06T00:00:00.000Z'),
        description: 'Correction',
        idProject: 501,
        idStakeholder: 10,
        idStakeholderProjectTransaction: 11,
      },
    ]);
  });

  it('deletes all transactions when replacement payload is empty', async () => {
    jest.spyOn(transactionPrisma.projectStakeholder, 'findUnique').mockResolvedValue({
      idProjectStakeholder: 900,
    });
    jest
      .spyOn(transactionPrisma.stakeholderProjectTransaction, 'deleteMany')
      .mockResolvedValue({ count: 2 });
    jest
      .spyOn(transactionPrisma.stakeholderProjectTransaction, 'findMany')
      .mockResolvedValue([]);

    const service = new StakeholderProjectTransactionsService(prisma);
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
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findUnique')
      .mockResolvedValue(null);

    const service = new StakeholderProjectTransactionsService(prisma);

    await expect(
      service.replaceProjectStakeholderTransactions(501, 10, []),
    ).rejects.toThrow(
      new NotFoundException(
        'Stakeholder 10 is not assigned to project 501',
      ),
    );
    expect(
      transactionPrisma.stakeholderProjectTransaction.deleteMany,
    ).not.toHaveBeenCalled();
  });
});
