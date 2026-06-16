import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';

type ProjectCreateMock = (args: {
  data: {
    idModel: number;
    idProduct: number;
    units: number;
    unitCost: number;
    productionCost: number;
    adminCost: number;
    costAdjustment?: number;
    adjustmentDescription?: string;
    isActive?: boolean;
  };
}) => Promise<unknown>;
type ProjectFindFirstMock = (
  args: unknown,
) => Promise<{ idProject: number } | null>;
type ProjectFindUniqueMock = (args: unknown) => Promise<unknown>;
type ProjectUpdateMock = (args: unknown) => Promise<unknown>;
type ProjectTransactionMock = {
  project: {
    create: jest.MockedFunction<ProjectCreateMock>;
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
  const projectFindFirst = jest.fn<ProjectFindFirstMock>();
  const projectFindUnique = jest.fn<ProjectFindUniqueMock>();
  const projectUpdate = jest.fn<ProjectUpdateMock>();
  const transactionPrisma: ProjectTransactionMock = {
    project: {
      create: projectCreate,
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
      findFirst: projectFindFirst,
      findUnique: projectFindUnique,
      update: projectUpdate,
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.resetAllMocks();
    runTransaction.mockImplementation(
      (callback: (tx: ProjectTransactionMock) => Promise<unknown>) =>
        callback(transactionPrisma),
    );
    projectFindFirst.mockResolvedValue(null);
    projectFindUnique.mockResolvedValue({
      idProject: 501,
      idProduct: 42,
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
      idModel: 9,
      idProduct: 42,
      units: 10,
      unitCost: 4.5,
      productionCost: 7.75,
      adminCost: 2.25,
      isActive: true,
    });

    expect(runTransaction).toHaveBeenCalled();
    expect(projectFindFirst).not.toHaveBeenCalled();
    expect(projectCreate).toHaveBeenCalledWith({
      data: {
        idModel: 9,
        idProduct: 42,
        units: 10,
        unitCost: 4.5,
        productionCost: 7.75,
        adminCost: 2.25,
        costAdjustment: 0,
        isActive: true,
      },
    });
  });

  it('creates projects with signed cost adjustment details', async () => {
    const service = new ProjectsService(prisma);
    await service.create({
      idModel: 9,
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
        idModel: 9,
        idProduct: 42,
        units: 10,
        unitCost: 4.5,
        productionCost: 7.75,
        adminCost: 2.25,
        costAdjustment: -1.5,
        adjustmentDescription: 'Damaged packaging discount',
        isActive: true,
      },
    });
  });

  it('defaults omitted unit fields to zero and active status to true when creating projects', async () => {
    const service = new ProjectsService(prisma);
    await service.create({
      idModel: 9,
      idProduct: 42,
    });

    expect(projectCreate).toHaveBeenCalledWith({
      data: {
        idModel: 9,
        idProduct: 42,
        units: 0,
        unitCost: 0,
        productionCost: 0,
        adminCost: 0,
        costAdjustment: 0,
        isActive: true,
      },
    });
  });

  it('allows creating multiple active projects for the same product', async () => {
    projectFindFirst.mockResolvedValue({ idProject: 500 });

    const service = new ProjectsService(prisma);

    await service.create({
      idModel: 9,
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
        idModel: 9,
        idProduct: 42,
        isActive: true,
      }),
    });
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
      where: { idProject: 501 },
    });
  });
});
