import { ProjectTransactionsService } from './project-transactions.service';

describe('ProjectTransactionsService', () => {
  const transactionPrisma = {
    $queryRaw: jest.fn(),
    project: {
      findUnique: jest.fn(),
    },
    projectTransaction: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;
  const prisma = {
    $transaction: jest.fn((callback) => callback(transactionPrisma)),
    projectTransaction: {
      findMany: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback) =>
      callback(transactionPrisma),
    );
  });

  it('lists project transactions ordered newest first', async () => {
    jest.spyOn(prisma.projectTransaction, 'findMany').mockResolvedValue([
      {
        amount: '125.50',
        description: 'Production run',
        idProject: 501,
        idProjectTransaction: 2,
      },
    ]);

    const service = new ProjectTransactionsService(prisma);
    await service.findByProject(501);

    expect(prisma.projectTransaction.findMany).toHaveBeenCalledWith({
      orderBy: { idProjectTransaction: 'desc' },
      where: { idProject: 501 },
    });
  });

  it('replaces all project transactions atomically', async () => {
    jest.spyOn(transactionPrisma.project, 'findUnique').mockResolvedValue({
      idProject: 501,
    });
    jest
      .spyOn(transactionPrisma.projectTransaction, 'deleteMany')
      .mockResolvedValue({ count: 2 });
    jest
      .spyOn(transactionPrisma.projectTransaction, 'createMany')
      .mockResolvedValue({ count: 2 });
    jest
      .spyOn(transactionPrisma.projectTransaction, 'findMany')
      .mockResolvedValue([
        {
          amount: '100.00',
          description: 'Production',
          idProject: 501,
          idProjectTransaction: 10,
        },
        {
          amount: '-15.00',
          description: 'Supplier credit',
          idProject: 501,
          idProjectTransaction: 11,
        },
      ]);

    const service = new ProjectTransactionsService(prisma);
    const result = await service.replaceProjectTransactions(501, [
      { amount: 100, description: 'Production' },
      { amount: -15, description: 'Supplier credit' },
    ]);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(transactionPrisma.$queryRaw).toHaveBeenCalled();
    expect(transactionPrisma.project.findUnique).toHaveBeenCalledWith({
      select: { idProject: true },
      where: { idProject: 501 },
    });
    expect(transactionPrisma.projectTransaction.deleteMany).toHaveBeenCalledWith({
      where: { idProject: 501 },
    });
    expect(transactionPrisma.projectTransaction.createMany).toHaveBeenCalledWith({
      data: [
        { amount: 100, description: 'Production', idProject: 501 },
        { amount: -15, description: 'Supplier credit', idProject: 501 },
      ],
    });
    expect(result).toEqual([
      {
        amount: '100.00',
        description: 'Production',
        idProject: 501,
        idProjectTransaction: 10,
      },
      {
        amount: '-15.00',
        description: 'Supplier credit',
        idProject: 501,
        idProjectTransaction: 11,
      },
    ]);
  });

  it('deletes all transactions when replacement payload is empty', async () => {
    jest.spyOn(transactionPrisma.project, 'findUnique').mockResolvedValue({
      idProject: 501,
    });
    jest
      .spyOn(transactionPrisma.projectTransaction, 'deleteMany')
      .mockResolvedValue({ count: 2 });
    jest
      .spyOn(transactionPrisma.projectTransaction, 'findMany')
      .mockResolvedValue([]);

    const service = new ProjectTransactionsService(prisma);
    await service.replaceProjectTransactions(501, []);

    expect(transactionPrisma.projectTransaction.deleteMany).toHaveBeenCalledWith({
      where: { idProject: 501 },
    });
    expect(
      transactionPrisma.projectTransaction.createMany,
    ).not.toHaveBeenCalled();
  });
});
