import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReportsService', () => {
  const prisma = {
    sale: {
      findMany: jest.fn(),
    },
  } as any;

  beforeEach(() => jest.resetAllMocks());

  it('lists available sales report periods by year and month', async () => {
    jest.spyOn(prisma.sale, 'findMany').mockResolvedValue([
      { date: new Date('2026-05-05T00:00:00.000Z') },
      { date: new Date('2026-05-20T00:00:00.000Z') },
      { date: new Date('2026-06-01T00:00:00.000Z') },
      { date: new Date('2025-12-31T00:00:00.000Z') },
    ]);

    const service = new ReportsService(prisma as PrismaService);
    const result = await service.findSalesSummaryPeriods();

    expect(prisma.sale.findMany).toHaveBeenCalledWith({
      orderBy: { date: 'desc' },
      select: { date: true },
    });
    expect(result).toEqual([
      { year: 2026, months: [6, 5] },
      { year: 2025, months: [12] },
    ]);
  });

  it('aggregates sales by product and project for a selected month', async () => {
    jest.spyOn(prisma.sale, 'findMany').mockResolvedValue([
      {
        amount: '200.00',
        fee: '5.00',
        idProject: 501,
        product: {
          id: 42,
          model: { name: 'Furniture' },
          name: 'Maple Shelf',
          ownership: '25.00',
        },
        project: {
          adminCost: '20.00',
          idProject: 501,
          productionCost: '100.00',
        },
        quantity: 2,
        source: 'store',
      },
      {
        amount: '150.00',
        fee: '2.00',
        idProject: 501,
        product: {
          id: 42,
          model: { name: 'Furniture' },
          name: 'Maple Shelf',
          ownership: '25.00',
        },
        project: {
          adminCost: '20.00',
          idProject: 501,
          productionCost: '100.00',
        },
        quantity: 1,
        source: 'ecommerce',
      },
      {
        amount: '300.00',
        fee: '10.00',
        idProject: 502,
        product: {
          id: 42,
          model: { name: 'Furniture' },
          name: 'Maple Shelf',
          ownership: '25.00',
        },
        project: {
          adminCost: '30.00',
          idProject: 502,
          productionCost: '70.00',
        },
        quantity: 3,
        source: 'event',
      },
    ]);

    const service = new ReportsService(prisma as PrismaService);
    const result = await service.getSalesSummary({ year: 2026, month: 5 });

    expect(prisma.sale.findMany).toHaveBeenCalledWith({
      include: {
        product: { include: { model: true } },
        project: true,
      },
      orderBy: [{ product: { name: 'asc' } }, { idProject: 'asc' }],
      where: {
        date: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lt: new Date('2026-06-01T00:00:00.000Z'),
        },
      },
    });
    expect(result.sources).toEqual(['store', 'ecommerce', 'event']);
    expect(result.rows).toEqual([
      {
        ecommerce: { amount: 150, quantity: 1 },
        event: { amount: 0, quantity: 0 },
        fee: 7,
        income: 230,
        model: 'Furniture',
        ownerProfit: 55.75,
        productName: 'Maple Shelf',
        profit: 223,
        projectId: 501,
        store: { amount: 200, quantity: 2 },
        surface: { amount: 0, quantity: 0 },
        totalAmount: 350,
        totalCost: 120,
        totalQuantity: 3,
      },
      {
        ecommerce: { amount: 0, quantity: 0 },
        event: { amount: 300, quantity: 3 },
        fee: 10,
        income: 200,
        model: 'Furniture',
        ownerProfit: 47.5,
        productName: 'Maple Shelf',
        profit: 190,
        projectId: 502,
        store: { amount: 0, quantity: 0 },
        surface: { amount: 0, quantity: 0 },
        totalAmount: 300,
        totalCost: 100,
        totalQuantity: 3,
      },
    ]);
  });

  it('adds surface as a visible report source only when surface sales exist', async () => {
    jest.spyOn(prisma.sale, 'findMany').mockResolvedValue([
      {
        amount: '80.00',
        fee: '0.00',
        idProject: 701,
        product: {
          id: 88,
          model: null,
          name: 'Event Kit',
          ownership: '50.00',
        },
        project: {
          adminCost: '10.00',
          idProject: 701,
          productionCost: '20.00',
        },
        quantity: 4,
        source: 'surface',
      },
    ]);

    const service = new ReportsService(prisma as PrismaService);
    const result = await service.getSalesSummary({ year: 2026 });

    expect(result.sources).toEqual(['store', 'ecommerce', 'event', 'surface']);
    expect(result.rows[0].surface).toEqual({ amount: 80, quantity: 4 });
  });
});
