import { asPrismaService } from '../../test/prisma-service.mock';
import { publicProjectDetailSelect } from './project-public-select';
import { ProjectsService } from './projects.service';

type ProjectCreateMock = (args: {
  data: {
    feeModel: string;
    feeValue: number;
    fixedRoi?: boolean;
    fixedRoiPercentage?: number | null;
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
type ProductFindUniqueMock = (
  args: unknown,
) => Promise<{ name: string } | null>;
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
  };

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
      fixedRoi: false,
      fixedRoiPercentage: null,
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
    const service = new ProjectsService(asPrismaService(prisma));
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
      select: publicProjectDetailSelect,
    });
    expect(publicProjectDetailSelect).not.toHaveProperty('createdDate');
  });

  it('creates projects with signed cost adjustment details', async () => {
    const service = new ProjectsService(asPrismaService(prisma));
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
      select: publicProjectDetailSelect,
    });
    expect(publicProjectDetailSelect).not.toHaveProperty('createdDate');
  });

  it('creates a project with a fixed ROI percentage', async () => {
    const service = new ProjectsService(asPrismaService(prisma));
    await service.create({
      feeModel: 'percentage',
      feeValue: 18,
      fixedRoi: true,
      fixedRoiPercentage: 25.5,
      idProduct: 42,
    });

    expect(projectCreate).toHaveBeenCalledWith({
      data: {
        adminCost: 0,
        costAdjustment: 0,
        feeModel: 'percentage',
        feeValue: 18,
        fixedRoi: true,
        fixedRoiPercentage: 25.5,
        idProduct: 42,
        name: 'Maple Shelf',
        productionCost: 0,
        unitCost: 0,
        units: 0,
      },
      select: publicProjectDetailSelect,
    });
  });

  it('rejects a fixed ROI project without a percentage', async () => {
    const service = new ProjectsService(asPrismaService(prisma));

    await expect(
      service.create({
        feeModel: 'percentage',
        feeValue: 18,
        fixedRoi: true,
        idProduct: 42,
      }),
    ).rejects.toThrow(
      'Fixed ROI percentage must be a non-negative number when Fixed ROI is enabled',
    );
    expect(projectCreate).not.toHaveBeenCalled();
  });

  it('defaults omitted unit fields to zero without forcing active status when creating projects', async () => {
    const service = new ProjectsService(asPrismaService(prisma));
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
      select: publicProjectDetailSelect,
    });
    expect(publicProjectDetailSelect).not.toHaveProperty('createdDate');
  });

  it('allows creating multiple active projects for the same product', async () => {
    projectFindFirst.mockResolvedValue({ idProject: 500 });

    const service = new ProjectsService(asPrismaService(prisma));

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
      data: {
        adminCost: 2.25,
        costAdjustment: 0,
        feeModel: 'percentage',
        feeValue: 18,
        idProduct: 42,
        isActive: true,
        name: 'Maple Shelf',
        productionCost: 7.75,
        unitCost: 4.5,
        units: 10,
      },
      select: publicProjectDetailSelect,
    });
    expect(publicProjectDetailSelect).not.toHaveProperty('createdDate');
  });

  it('uses an explicit public project select when listing projects', async () => {
    const service = new ProjectsService(asPrismaService(prisma));

    await service.findAll({ page: 1, pageSize: 25 });

    expect(projectFindMany).toHaveBeenCalledWith({
      orderBy: { idProject: 'desc' },
      select: publicProjectDetailSelect,
      skip: 0,
      take: 25,
    });
  });

  it('allows updating a project to active when the product already has one', async () => {
    projectFindFirst.mockResolvedValue({ idProject: 500 });

    const service = new ProjectsService(asPrismaService(prisma));

    await service.update(501, {
      isActive: true,
    });

    expect(projectFindFirst).not.toHaveBeenCalled();
    expect(projectUpdate).toHaveBeenCalledWith({
      data: { isActive: true },
      select: publicProjectDetailSelect,
      where: { idProject: 501 },
    });
  });

  it('clears the fixed ROI percentage when the model is disabled', async () => {
    projectFindUnique.mockResolvedValue({
      fixedRoi: true,
      fixedRoiPercentage: '25.50',
      idProject: 501,
    });
    const service = new ProjectsService(asPrismaService(prisma));

    await service.update(501, {
      fixedRoi: false,
    });

    expect(projectUpdate).toHaveBeenCalledWith({
      data: {
        fixedRoi: false,
        fixedRoiPercentage: null,
      },
      select: publicProjectDetailSelect,
      where: { idProject: 501 },
    });
  });
});
