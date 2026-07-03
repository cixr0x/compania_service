import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';

type ProjectCreateMock = (args: {
  data: {
    feeModel: string;
    feeValue: number;
    idProduct: number;
    name: string;
    units: number;
    unitCost: number;
    productionCost: number;
    adminCost: number;
    costAdjustment?: number;
    adjustmentDescription?: string;
    isActive?: boolean;
  };
  select?: unknown;
}) => Promise<unknown>;
type ProjectFindFirstMock = (
  args: unknown,
) => Promise<{ idProject: number } | null>;
type ProjectFindManyMock = (args: unknown) => Promise<unknown[]>;
type ProjectFindUniqueMock = (args: unknown) => Promise<unknown>;
type ProjectUpdateMock = (args: unknown) => Promise<unknown>;
type ProductFindUniqueMock = (args: unknown) => Promise<{ name: string } | null>;
type ProjectTransactionMock = {
  product: {
    findUnique: jest.MockedFunction<ProductFindUniqueMock>;
  };
  project: {
    create: jest.MockedFunction<ProjectCreateMock>;
    findMany: jest.MockedFunction<ProjectFindManyMock>;
    findFirst: jest.MockedFunction<ProjectFindFirstMock>;
    findUnique: jest.MockedFunction<ProjectFindUniqueMock>;
    update: jest.MockedFunction<ProjectUpdateMock>;
  };
};
type ProjectTransactionRunner = (
  callback: (tx: ProjectTransactionMock) => Promise<unknown>,
) => Promise<unknown>;

describe('ProjectsService', () => {
  const projectCreate = jest.fn<ProjectCreateMock>();
  const projectFindMany = jest.fn<ProjectFindManyMock>();
  const projectFindFirst = jest.fn<ProjectFindFirstMock>();
  const projectFindUnique = jest.fn<ProjectFindUniqueMock>();
  const projectUpdate = jest.fn<ProjectUpdateMock>();
  const productFindUnique = jest.fn<ProductFindUniqueMock>();
  const transactionPrisma: ProjectTransactionMock = {
    product: {
      findUnique: productFindUnique,
    },
    project: {
      create: projectCreate,
      findMany: projectFindMany,
      findFirst: projectFindFirst,
      findUnique: projectFindUnique,
      update: projectUpdate,
    },
  };
  const runTransaction = jest.fn<ProjectTransactionRunner>();
  const prisma = {
    $transaction: runTransaction,
    project: {
      create: projectCreate,
      findMany: projectFindMany,
      findFirst: projectFindFirst,
      findUnique: projectFindUnique,
      update: projectUpdate,
    },
    product: {
      findUnique: productFindUnique,
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.resetAllMocks();
    runTransaction.mockImplementation(
      (callback: (tx: ProjectTransactionMock) => Promise<unknown>) =>
        callback(transactionPrisma),
    );
    productFindUnique.mockResolvedValue({ name: 'Maple Shelf' });
    projectFindMany.mockResolvedValue([]);
    projectFindFirst.mockResolvedValue(null);
    projectFindUnique.mockResolvedValue({
      idProject: 501,
      idProduct: 42,
      name: 'Maple Shelf',
      units: 10,
      unitCost: '4.50',
      productionCost: '7.75',
      adminCost: '2.25',
      costAdjustment: '0.00',
      adjustmentDescription: null,
      isActive: false,
    });
  });

  it('creates projects with production cost and active flag', async () => {
    const service = new ProjectsService(prisma);
    await service.create({
      feeModel: 'percentage',
      feeValue: 18,
      idProduct: 42,
      units: 10,
      unitCost: 4.5,
      productionCost: 7.75,
      adminCost: 2.25,
      isActive: true,
    });

    expect(runTransaction).toHaveBeenCalled();
    expect(projectFindFirst).not.toHaveBeenCalled();
    expect(productFindUnique).toHaveBeenCalledWith({
      select: { name: true },
      where: { id: 42 },
    });
    expect(projectCreate).toHaveBeenCalledWith({
      data: {
        feeModel: 'percentage',
        feeValue: 18,
        idProduct: 42,
        name: 'Maple Shelf',
        units: 10,
        unitCost: 4.5,
        productionCost: 7.75,
        adminCost: 2.25,
        costAdjustment: 0,
        isActive: true,
      },
      select: expect.objectContaining({
        name: true,
      }),
    });
    expect(projectCreate.mock.calls[0]?.[0].select).not.toHaveProperty(
      'createdDate',
    );
  });

  it('creates projects with signed cost adjustment details', async () => {
    const service = new ProjectsService(prisma);
    await service.create({
      feeModel: 'fixed',
      feeValue: 125.5,
      idProduct: 42,
      units: 10,
      unitCost: 4.5,
      productionCost: 7.75,
      adminCost: 2.25,
      costAdjustment: -1.5,
      adjustmentDescription: 'Damaged packaging discount',
    });

    expect(projectCreate).toHaveBeenCalledWith({
      data: {
        feeModel: 'fixed',
        feeValue: 125.5,
        idProduct: 42,
        name: 'Maple Shelf',
        units: 10,
        unitCost: 4.5,
        productionCost: 7.75,
        adminCost: 2.25,
        costAdjustment: -1.5,
        adjustmentDescription: 'Damaged packaging discount',
      },
      select: expect.objectContaining({
        name: true,
      }),
    });
    expect(projectCreate.mock.calls[0]?.[0].select).not.toHaveProperty(
      'createdDate',
    );
  });

  it('defaults omitted unit fields to zero without forcing active status when creating projects', async () => {
    const service = new ProjectsService(prisma);
    await service.create({
      feeModel: 'percentage',
      feeValue: 18,
      idProduct: 42,
    });

    expect(projectCreate).toHaveBeenCalledWith({
      data: {
        feeModel: 'percentage',
        feeValue: 18,
        idProduct: 42,
        name: 'Maple Shelf',
        units: 0,
        unitCost: 0,
        productionCost: 0,
        adminCost: 0,
        costAdjustment: 0,
      },
      select: expect.objectContaining({
        name: true,
      }),
    });
    expect(projectCreate.mock.calls[0]?.[0].select).not.toHaveProperty(
      'createdDate',
    );
    expect(projectCreate.mock.calls[0]?.[0].data).not.toHaveProperty(
      'isActive',
    );
  });

  it('allows creating multiple active projects for the same product', async () => {
    projectFindFirst.mockResolvedValue({ idProject: 500 });

    const service = new ProjectsService(prisma);

    await service.create({
      feeModel: 'percentage',
      feeValue: 18,
      idProduct: 42,
      units: 10,
      unitCost: 4.5,
      productionCost: 7.75,
      adminCost: 2.25,
      isActive: true,
    });

    expect(projectFindFirst).not.toHaveBeenCalled();
    expect(projectCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        feeModel: 'percentage',
        feeValue: 18,
        idProduct: 42,
        isActive: true,
        name: 'Maple Shelf',
      }),
      select: expect.objectContaining({
        name: true,
      }),
    });
    expect(projectCreate.mock.calls[0]?.[0].select).not.toHaveProperty(
      'createdDate',
    );
  });

  it('uses an explicit public project select when listing projects', async () => {
    const service = new ProjectsService(prisma);

    await service.findAll({ page: 1, pageSize: 25 });

    expect(projectFindMany).toHaveBeenCalledWith({
      orderBy: { idProject: 'desc' },
      select: expect.objectContaining({
        name: true,
        product: true,
      }),
      skip: 0,
      take: 25,
    });
    expect(projectFindMany.mock.calls[0]?.[0]).not.toHaveProperty('include');
  });

  it('allows updating a project to active when the product already has one', async () => {
    projectFindFirst.mockResolvedValue({ idProject: 500 });

    const service = new ProjectsService(prisma);

    await service.update(501, {
      isActive: true,
    });

    expect(projectFindFirst).not.toHaveBeenCalled();
    expect(projectUpdate).toHaveBeenCalledWith({
      data: { isActive: true },
      select: expect.objectContaining({
        name: true,
      }),
      where: { idProject: 501 },
    });
  });
});
