import { SalesService } from './sales.service';
import { SaleFeeCalculatorService } from './sale-fee-calculator.service';
import { SaleFinancialsCalculatorService } from './sale-financials-calculator.service';
import { publicProjectSummarySelect } from '../projects/project-public-select';
import { asPrismaService } from '../../test/prisma-service.mock';

type AsyncMock = (args: unknown) => Promise<unknown>;

describe('SalesService', () => {
  const prisma = {
    sale: {
      create: jest.fn<AsyncMock>(),
      findMany: jest.fn<AsyncMock>(),
      findUnique: jest.fn<AsyncMock>(),
      update: jest.fn<AsyncMock>(),
    },
    product: {
      findUnique: jest.fn<AsyncMock>(),
    },
    project: {
      findUnique: jest.fn<AsyncMock>(),
    },
    setting: {
      findUnique: jest.fn<AsyncMock>(),
    },
  };
  const calculateFee = jest.fn<SaleFeeCalculatorService['calculateFee']>();
  const calculateFinancials =
    jest.fn<SaleFinancialsCalculatorService['calculateFinancials']>();
  const feeCalculator = {
    calculateFee,
  } as unknown as SaleFeeCalculatorService;
  const financialsCalculator = {
    calculateFinancials,
  } as unknown as SaleFinancialsCalculatorService;

  beforeEach(() => {
    jest.resetAllMocks();
    calculateFee.mockResolvedValue(9.5);
    calculateFinancials.mockResolvedValue({
      ownerProfit: 27.63,
      profit: 110.5,
    });
  });

  function buildService() {
    return new SalesService(
      asPrismaService(prisma),
      feeCalculator,
      financialsCalculator,
    );
  }

  it('loads product names for sale project references in list responses', async () => {
    prisma.sale.findMany.mockResolvedValue([]);

    const service = buildService();
    await service.findAll({ page: 1, pageSize: 25 });

    expect(prisma.sale.findMany).toHaveBeenCalledWith({
      include: {
        product: true,
        project: {
          select: publicProjectSummarySelect,
        },
      },
      orderBy: { idSale: 'desc' },
      skip: 0,
      take: 25,
    });
    expect(publicProjectSummarySelect).not.toHaveProperty('createdDate');
  });

  it('filters list responses by product, project, and sale month', async () => {
    prisma.sale.findMany.mockResolvedValue([]);

    const service = buildService();
    await service.findAll({
      idProduct: 42,
      idProject: 501,
      month: '2026-05',
      page: 2,
      pageSize: 10,
    });

    expect(prisma.sale.findMany).toHaveBeenCalledWith({
      include: {
        product: true,
        project: {
          select: publicProjectSummarySelect,
        },
      },
      orderBy: { idSale: 'desc' },
      skip: 10,
      take: 10,
      where: {
        date: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lt: new Date('2026-06-01T00:00:00.000Z'),
        },
        idProduct: 42,
        idProject: 501,
      },
    });
  });

  it('creates a sale with default fee and persisted profit fields when fee is omitted', async () => {
    prisma.sale.create.mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '0.00',
    });
    prisma.product.findUnique.mockResolvedValue({ id: 7 });
    prisma.project.findUnique.mockResolvedValue({
      idProject: 51,
      idProduct: 7,
    });

    const service = buildService();
    await service.create({
      date: '2026-05-05',
      idProject: 51,
      idProduct: 7,
      quantity: 2,
      amount: 120,
      source: 'ecommerce',
    });

    expect(prisma.sale.create).toHaveBeenCalledWith({
      data: {
        date: new Date('2026-05-05'),
        idProject: 51,
        idProduct: 7,
        quantity: 2,
        amount: 120,
        source: 'ecommerce',
        fee: 9.5,
        feeOverride: false,
        ownerProfit: 27.63,
        profit: 110.5,
      },
    });
    expect(calculateFee).toHaveBeenCalledWith({
      amount: 120,
      idProject: 51,
      quantity: 2,
    });
    expect(prisma.setting.findUnique).not.toHaveBeenCalled();
    expect(calculateFinancials).toHaveBeenCalledWith({
      amount: 120,
      fee: 9.5,
      idProduct: 7,
    });
  });

  it('creates a sale with a Date instance when date is a string', async () => {
    prisma.sale.create.mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
    });
    prisma.product.findUnique.mockResolvedValue({ id: 7 });
    prisma.project.findUnique.mockResolvedValue({
      idProject: 51,
      idProduct: 7,
    });

    const service = buildService();
    await service.create({
      date: '2026-05-05',
      idProject: 51,
      idProduct: 7,
      quantity: 2,
      amount: 120,
      source: 'ecommerce',
      fee: 1.5,
      feeOverride: true,
    });

    expect(prisma.sale.create).toHaveBeenCalledWith({
      data: {
        date: new Date('2026-05-05'),
        idProject: 51,
        idProduct: 7,
        quantity: 2,
        amount: 120,
        source: 'ecommerce',
        fee: 1.5,
        feeOverride: true,
        ownerProfit: 27.63,
        profit: 110.5,
      },
    });
    expect(calculateFee).not.toHaveBeenCalled();
    expect(calculateFinancials).toHaveBeenCalledWith({
      amount: 120,
      fee: 1.5,
      idProduct: 7,
    });
  });

  it('recalculates fee in update data when fee override is disabled', async () => {
    prisma.sale.findUnique.mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      idProject: 51,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
    });
    prisma.sale.update.mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      idProject: 51,
      quantity: 3,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
    });

    const service = buildService();
    await service.update(1, { quantity: 3 });

    expect(prisma.sale.update).toHaveBeenCalledWith({
      where: { idSale: 1 },
      data: { quantity: 3, fee: 9.5, ownerProfit: 27.63, profit: 110.5 },
    });
    expect(calculateFee).toHaveBeenCalledWith({
      amount: '120.00',
      idProject: 51,
      quantity: 3,
    });
  });

  it('does not include date in update data when date is omitted', async () => {
    prisma.sale.findUnique.mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      idProject: 51,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
    });
    prisma.sale.update.mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      idProject: 51,
      quantity: 2,
      amount: '130.00',
      source: 'ecommerce',
      fee: '1.50',
    });

    const service = buildService();
    await service.update(1, { amount: 130 });

    expect(prisma.sale.update).toHaveBeenCalledWith({
      where: { idSale: 1 },
      data: {
        amount: 130,
        fee: 9.5,
        ownerProfit: 27.63,
        profit: 110.5,
      },
    });
    expect(calculateFee).toHaveBeenCalledWith({
      amount: 130,
      idProject: 51,
      quantity: 2,
    });
  });

  it('preserves manual fee when fee override is enabled', async () => {
    prisma.sale.findUnique.mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      idProject: 51,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
      feeOverride: true,
    });
    prisma.sale.update.mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      idProject: 51,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '2.00',
    });

    const service = buildService();
    await service.update(1, { fee: 2, feeOverride: true });

    expect(prisma.sale.update).toHaveBeenCalledWith({
      where: { idSale: 1 },
      data: {
        fee: 2,
        feeOverride: true,
        ownerProfit: 27.63,
        profit: 110.5,
      },
    });
    expect(calculateFee).not.toHaveBeenCalled();
    expect(calculateFinancials).toHaveBeenCalledWith({
      amount: '120.00',
      fee: 2,
      idProduct: 7,
    });
  });

  it('does not require a sales tax setting when creating a sale', async () => {
    prisma.setting.findUnique.mockResolvedValue(null);
    prisma.product.findUnique.mockResolvedValue({ id: 7 });
    prisma.project.findUnique.mockResolvedValue({
      idProject: 51,
      idProduct: 7,
    });
    prisma.sale.create.mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProject: 51,
      idProduct: 7,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '9.50',
    });

    const service = buildService();

    await service.create({
      date: '2026-05-05',
      idProject: 51,
      idProduct: 7,
      quantity: 2,
      amount: 120,
      source: 'ecommerce',
    });

    expect(prisma.setting.findUnique).not.toHaveBeenCalled();
    expect(prisma.sale.create).toHaveBeenCalledWith({
      data: {
        date: new Date('2026-05-05'),
        idProject: 51,
        idProduct: 7,
        quantity: 2,
        amount: 120,
        source: 'ecommerce',
        fee: 9.5,
        feeOverride: false,
        ownerProfit: 27.63,
        profit: 110.5,
      },
    });
  });

  it('creates a sale only after verifying the project belongs to the product', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 7 });
    prisma.project.findUnique.mockResolvedValue({
      idProject: 51,
      idProduct: 7,
    });
    prisma.sale.create.mockResolvedValue({
      idSale: 2,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProject: 51,
      idProduct: 7,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '0.00',
    });

    const service = buildService();
    await service.create({
      date: '2026-05-05',
      idProject: 51,
      idProduct: 7,
      quantity: 2,
      amount: 120,
      source: 'ecommerce',
    });

    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { idProject: 51 },
      select: { idProject: true, idProduct: true },
    });
    expect(prisma.sale.create).toHaveBeenCalledWith({
      data: {
        date: new Date('2026-05-05'),
        idProject: 51,
        idProduct: 7,
        quantity: 2,
        amount: 120,
        source: 'ecommerce',
        fee: 9.5,
        feeOverride: false,
        ownerProfit: 27.63,
        profit: 110.5,
      },
    });
  });

  it('throws a client error when create references a project for a different product', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 7 });
    prisma.project.findUnique.mockResolvedValue({
      idProject: 51,
      idProduct: 8,
    });

    const service = buildService();

    await expect(
      service.create({
        date: '2026-05-05',
        idProject: 51,
        idProduct: 7,
        quantity: 2,
        amount: 120,
        source: 'ecommerce',
      }),
    ).rejects.toThrow('Project 51 does not belong to product 7');
    expect(prisma.sale.create).not.toHaveBeenCalled();
  });

  it('throws a client error when create references a missing product', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    const service = buildService();

    await expect(
      service.create({
        date: '2026-05-05',
        idProject: 51,
        idProduct: 999,
        quantity: 2,
        amount: 120,
        source: 'ecommerce',
      }),
    ).rejects.toThrow('Product 999 was not found');
    expect(prisma.sale.create).not.toHaveBeenCalled();
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
  });

  it('throws a client error when update references a missing product', async () => {
    prisma.sale.findUnique.mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      idProject: 51,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
    });
    prisma.product.findUnique.mockResolvedValue(null);

    const service = buildService();

    await expect(service.update(1, { idProduct: 999 })).rejects.toThrow(
      'Product 999 was not found',
    );
    expect(prisma.sale.update).not.toHaveBeenCalled();
  });

  it('validates the next project and product pair when updating either side', async () => {
    prisma.sale.findUnique.mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      idProject: 51,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
    });
    prisma.project.findUnique.mockResolvedValue({
      idProject: 52,
      idProduct: 8,
    });

    const service = buildService();

    await expect(service.update(1, { idProject: 52 })).rejects.toThrow(
      'Project 52 does not belong to product 7',
    );
    expect(prisma.sale.update).not.toHaveBeenCalled();
  });
});
