import { SalesService } from './sales.service';
import { PrismaService } from '../prisma/prisma.service';
import { SaleFeeCalculatorService } from './sale-fee-calculator.service';
import { SaleFinancialsCalculatorService } from './sale-financials-calculator.service';

describe('SalesService', () => {
  const prisma = {
    sale: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    setting: {
      findUnique: jest.fn(),
    },
  } as any;
  const feeCalculator = {
    calculateFee: jest.fn(),
  } as unknown as jest.Mocked<SaleFeeCalculatorService>;
  const financialsCalculator = {
    calculateFinancials: jest.fn(),
  } as unknown as jest.Mocked<SaleFinancialsCalculatorService>;

  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .spyOn(prisma.setting, 'findUnique')
      .mockResolvedValue({ value: '0.034' });
    jest.spyOn(feeCalculator, 'calculateFee').mockResolvedValue(9.5);
    jest
      .spyOn(financialsCalculator, 'calculateFinancials')
      .mockResolvedValue({ ownerProfit: 26.61, profit: 106.42 });
  });

  function buildService() {
    return new SalesService(
      prisma as PrismaService,
      feeCalculator,
      financialsCalculator,
    );
  }

  it('loads product names for sale project references in list responses', async () => {
    jest.spyOn(prisma.sale, 'findMany').mockResolvedValue([]);

    const service = buildService();
    await service.findAll({ page: 1, pageSize: 25 });

    expect(prisma.sale.findMany).toHaveBeenCalledWith({
      include: {
        product: true,
        project: { include: { product: true } },
      },
      orderBy: { idSale: 'desc' },
      skip: 0,
      take: 25,
    });
  });

  it('creates a sale with default fee and calculated tax when fee is omitted', async () => {
    jest.spyOn(prisma.sale, 'create').mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '0.00',
      tax: '4.08',
      taxPct: '0.034000',
    });
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({ id: 7 });
    jest
      .spyOn(prisma.project, 'findUnique')
      .mockResolvedValue({ idProject: 51, idProduct: 7 });

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
        ownerProfit: 26.61,
        profit: 106.42,
        tax: 4.08,
        taxPct: 0.034,
      },
    });
    expect(feeCalculator.calculateFee).toHaveBeenCalledWith({
      amount: 120,
      idProduct: 7,
      idProject: 51,
      quantity: 2,
    });
    expect(prisma.setting.findUnique).toHaveBeenCalledWith({
      where: { code: 'sales_tax' },
      select: { value: true },
    });
    expect(financialsCalculator.calculateFinancials).toHaveBeenCalledWith({
      amount: 120,
      fee: 9.5,
      idProduct: 7,
      tax: 4.08,
    });
  });

  it('creates a sale with a Date instance when date is a string', async () => {
    jest.spyOn(prisma.sale, 'create').mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
    });
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({ id: 7 });
    jest
      .spyOn(prisma.project, 'findUnique')
      .mockResolvedValue({ idProject: 51, idProduct: 7 });

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

    const call = prisma.sale.create.mock.calls[0][0];
    expect(call.data.date).toBeInstanceOf(Date);
    expect(call.data.date).toEqual(new Date('2026-05-05'));
    expect(call.data.fee).toBe(1.5);
    expect(call.data.feeOverride).toBe(true);
    expect(call.data.profit).toBe(106.42);
    expect(call.data.ownerProfit).toBe(26.61);
    expect(feeCalculator.calculateFee).not.toHaveBeenCalled();
    expect(financialsCalculator.calculateFinancials).toHaveBeenCalledWith({
      amount: 120,
      fee: 1.5,
      idProduct: 7,
      tax: 4.08,
    });
  });

  it('recalculates fee in update data when fee override is disabled', async () => {
    jest.spyOn(prisma.sale, 'findUnique').mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      idProject: 51,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
      tax: '4.08',
    });
    jest.spyOn(prisma.sale, 'update').mockResolvedValue({
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
      data: { quantity: 3, fee: 9.5, ownerProfit: 26.61, profit: 106.42 },
    });
    expect(feeCalculator.calculateFee).toHaveBeenCalledWith({
      amount: '120.00',
      idProduct: 7,
      idProject: 51,
      quantity: 3,
    });
  });

  it('does not include date in update data when date is omitted', async () => {
    jest.spyOn(prisma.sale, 'findUnique').mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      idProject: 51,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
      tax: '4.08',
    });
    jest.spyOn(prisma.sale, 'update').mockResolvedValue({
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
        ownerProfit: 26.61,
        profit: 106.42,
        tax: 4.42,
        taxPct: 0.034,
      },
    });
    expect(feeCalculator.calculateFee).toHaveBeenCalledWith({
      amount: 130,
      idProduct: 7,
      idProject: 51,
      quantity: 2,
    });
  });

  it('preserves manual fee when fee override is enabled', async () => {
    jest.spyOn(prisma.sale, 'findUnique').mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      idProject: 51,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
      feeOverride: true,
      tax: '4.08',
    });
    jest.spyOn(prisma.sale, 'update').mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      idProject: 51,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '2.00',
      tax: '4.08',
    });

    const service = buildService();
    await service.update(1, { fee: 2, feeOverride: true });

    expect(prisma.sale.update).toHaveBeenCalledWith({
      where: { idSale: 1 },
      data: {
        fee: 2,
        feeOverride: true,
        ownerProfit: 26.61,
        profit: 106.42,
        tax: 4.08,
        taxPct: 0.034,
      },
    });
    expect(feeCalculator.calculateFee).not.toHaveBeenCalled();
    expect(financialsCalculator.calculateFinancials).toHaveBeenCalledWith({
      amount: '120.00',
      fee: 2,
      idProduct: 7,
      tax: 4.08,
    });
  });

  it('rejects sale writes when the sales tax setting is missing', async () => {
    jest.spyOn(prisma.setting, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({ id: 7 });
    jest
      .spyOn(prisma.project, 'findUnique')
      .mockResolvedValue({ idProject: 51, idProduct: 7 });

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
    ).rejects.toThrow(
      'Setting sales_tax must be configured as a decimal tax rate',
    );
    expect(prisma.sale.create).not.toHaveBeenCalled();
  });

  it('creates a sale only after verifying the project belongs to the product', async () => {
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({ id: 7 });
    jest
      .spyOn(prisma.project, 'findUnique')
      .mockResolvedValue({ idProject: 51, idProduct: 7 });
    jest.spyOn(prisma.sale, 'create').mockResolvedValue({
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
      data: expect.objectContaining({ idProject: 51, idProduct: 7 }),
    });
  });

  it('throws a client error when create references a project for a different product', async () => {
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({ id: 7 });
    jest
      .spyOn(prisma.project, 'findUnique')
      .mockResolvedValue({ idProject: 51, idProduct: 8 });

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
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(null);

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
    jest.spyOn(prisma.sale, 'findUnique').mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      idProject: 51,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
    });
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(null);

    const service = buildService();

    await expect(service.update(1, { idProduct: 999 })).rejects.toThrow(
      'Product 999 was not found',
    );
    expect(prisma.sale.update).not.toHaveBeenCalled();
  });

  it('validates the next project and product pair when updating either side', async () => {
    jest.spyOn(prisma.sale, 'findUnique').mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      idProject: 51,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
    });
    jest
      .spyOn(prisma.project, 'findUnique')
      .mockResolvedValue({ idProject: 52, idProduct: 8 });

    const service = buildService();

    await expect(service.update(1, { idProject: 52 })).rejects.toThrow(
      'Project 52 does not belong to product 7',
    );
    expect(prisma.sale.update).not.toHaveBeenCalled();
  });
});
