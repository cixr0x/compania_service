import { ProjectTransactionsService } from './project-transactions.service';
import { asPrismaService } from '../../test/prisma-service.mock';

type ProjectFindUniqueMock = (
  args: unknown,
) => Promise<{ idProject: number } | null>;
type ProjectTransactionCreateManyMock = (
  args: unknown,
) => Promise<{ count: number }>;
type ProjectTransactionDeleteManyMock = (
  args: unknown,
) => Promise<{ count: number }>;
type ProjectTransactionFindManyMock = (args: unknown) => Promise<unknown[]>;
type QueryRawMock = (query: unknown) => Promise<unknown>;
type ProjectTransactionPrismaMock = {
  $queryRaw: jest.MockedFunction<QueryRawMock>;
  project: {
    findUnique: jest.MockedFunction<ProjectFindUniqueMock>;
  };
  projectTransaction: {
    createMany: jest.MockedFunction<ProjectTransactionCreateManyMock>;
    deleteMany: jest.MockedFunction<ProjectTransactionDeleteManyMock>;
    findMany: jest.MockedFunction<ProjectTransactionFindManyMock>;
  };
};
type ProjectTransactionRunner = (
  callback: (tx: ProjectTransactionPrismaMock) => Promise<unknown>,
) => Promise<unknown>;

describe('ProjectTransactionsService', () => {
  const transactionPrisma: ProjectTransactionPrismaMock = {
    $queryRaw: jest.fn<QueryRawMock>(),
    project: {
      findUnique: jest.fn<ProjectFindUniqueMock>(),
    },
    projectTransaction: {
      createMany: jest.fn<ProjectTransactionCreateManyMock>(),
      deleteMany: jest.fn<ProjectTransactionDeleteManyMock>(),
      findMany: jest.fn<ProjectTransactionFindManyMock>(),
    },
  };
  const runTransaction = jest.fn<ProjectTransactionRunner>();
  const prisma = {
    $transaction: runTransaction,
    projectTransaction: {
      findMany: jest.fn<ProjectTransactionFindManyMock>(),
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    runTransaction.mockImplementation(
      (callback: (tx: ProjectTransactionPrismaMock) => Promise<unknown>) =>
        callback(transactionPrisma),
    );
  });

  it('lists project transactions ordered newest first', async () => {
    jest.spyOn(prisma.projectTransaction, 'findMany').mockResolvedValue([
      {
        amount: '125.50',
        date: new Date('2026-05-05T00:00:00.000Z'),
        description: 'Production run',
        idProject: 501,
        idProjectTransaction: 2,
      },
    ]);

    const service = new ProjectTransactionsService(asPrismaService(prisma));
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
          date: new Date('2026-05-05T00:00:00.000Z'),
          description: 'Production',
          idProject: 501,
          idProjectTransaction: 10,
        },
        {
          amount: '-15.00',
          date: new Date('2026-05-06T00:00:00.000Z'),
          description: 'Supplier credit',
          idProject: 501,
          idProjectTransaction: 11,
        },
      ]);

    const service = new ProjectTransactionsService(asPrismaService(prisma));
    const result = await service.replaceProjectTransactions(501, [
      { amount: 100, date: '2026-05-05', description: 'Production' },
      { amount: -15, date: '2026-05-06', description: 'Supplier credit' },
    ]);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(transactionPrisma.$queryRaw).toHaveBeenCalled();
    expect(transactionPrisma.project.findUnique).toHaveBeenCalledWith({
      select: { idProject: true },
      where: { idProject: 501 },
    });
    expect(
      transactionPrisma.projectTransaction.deleteMany,
    ).toHaveBeenCalledWith({
      where: { idProject: 501 },
    });
    expect(
      transactionPrisma.projectTransaction.createMany,
    ).toHaveBeenCalledWith({
      data: [
        {
          amount: 100,
          date: new Date('2026-05-05T00:00:00.000Z'),
          description: 'Production',
          idProject: 501,
        },
        {
          amount: -15,
          date: new Date('2026-05-06T00:00:00.000Z'),
          description: 'Supplier credit',
          idProject: 501,
        },
      ],
    });
    expect(result).toEqual([
      {
        amount: '100.00',
        date: new Date('2026-05-05T00:00:00.000Z'),
        description: 'Production',
        idProject: 501,
        idProjectTransaction: 10,
      },
      {
        amount: '-15.00',
        date: new Date('2026-05-06T00:00:00.000Z'),
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

    const service = new ProjectTransactionsService(asPrismaService(prisma));
    await service.replaceProjectTransactions(501, []);

    expect(
      transactionPrisma.projectTransaction.deleteMany,
    ).toHaveBeenCalledWith({
      where: { idProject: 501 },
    });
    expect(
      transactionPrisma.projectTransaction.createMany,
    ).not.toHaveBeenCalled();
  });
});
