import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReportsService', () => {
  const prisma = {
    project: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    sale: {
      findMany: jest.fn(),
    },
  } as any;

  beforeEach(() => jest.resetAllMocks());

  it('lists available sales report periods by year and month', async () => {
    jest
      .spyOn(prisma.sale, 'findMany')
      .mockResolvedValue([
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
        ownerProfit: '47.50',
        product: {
          id: 42,
          image: 'https://example.test/maple-shelf.jpg',
          name: 'Maple Shelf',
          ownership: '25.00',
        },
        profit: '190.00',
        project: {
          adminCost: '20.00',
          idProject: 501,
          model: { name: 'Ladrillo' },
          productionCost: '100.00',
        },
        quantity: 2,
        source: 'store',
      },
      {
        amount: '150.00',
        fee: '2.00',
        idProject: 501,
        ownerProfit: '35.00',
        product: {
          id: 42,
          image: 'https://example.test/maple-shelf.jpg',
          name: 'Maple Shelf',
          ownership: '25.00',
        },
        profit: '140.00',
        project: {
          adminCost: '20.00',
          idProject: 501,
          model: { name: 'Ladrillo' },
          productionCost: '100.00',
        },
        quantity: 1,
        source: 'ecommerce',
      },
      {
        amount: '300.00',
        fee: '10.00',
        idProject: 502,
        ownerProfit: '65.00',
        product: {
          id: 42,
          image: 'https://example.test/maple-shelf.jpg',
          name: 'Maple Shelf',
          ownership: '25.00',
        },
        profit: '260.00',
        project: {
          adminCost: '30.00',
          idProject: 502,
          model: { name: 'Consigna' },
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
        product: true,
        project: { include: { model: true } },
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
        model: 'Ladrillo',
        ownerProfit: 82.5,
        productImage: 'https://example.test/maple-shelf.jpg',
        productName: 'Maple Shelf',
        profit: 330,
        projectId: 501,
        store: { amount: 200, quantity: 2 },
        surface: { amount: 0, quantity: 0 },
        totalAmount: 350,
        totalQuantity: 3,
      },
      {
        ecommerce: { amount: 0, quantity: 0 },
        event: { amount: 300, quantity: 3 },
        fee: 10,
        model: 'Consigna',
        ownerProfit: 65,
        productImage: 'https://example.test/maple-shelf.jpg',
        productName: 'Maple Shelf',
        profit: 260,
        projectId: 502,
        store: { amount: 0, quantity: 0 },
        surface: { amount: 0, quantity: 0 },
        totalAmount: 300,
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
        ownerProfit: '40.00',
        product: {
          id: 88,
          name: 'Event Kit',
          ownership: '50.00',
        },
        profit: '80.00',
        project: {
          adminCost: '10.00',
          idProject: 701,
          model: null,
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

  it('builds an all-time stakeholder project report for one project stakeholder', async () => {
    jest.spyOn(prisma.project, 'findFirst').mockResolvedValue(
      {
        adminCost: '20.00',
        costAdjustment: '-10.00',
        idProject: 501,
        product: {
          image: 'https://example.test/maple-shelf.jpg',
          name: 'Maple Shelf',
        },
        sales: [
          {
            amount: '200.00',
            fee: '5.00',
            quantity: 2,
            source: 'store',
          },
          {
            amount: '150.00',
            fee: '2.00',
            quantity: 1,
            source: 'ecommerce',
          },
        ],
        stakeholders: [
          {
            idProjectStakeholder: 900,
            stakePercentage: '60.00',
            stakeholder: { idStakeholder: 10, name: 'Alicia' },
            transactions: [
              { amount: '125.50' },
              { amount: '-25.50' },
            ],
          },
        ],
        transactions: [
          { amount: '100.00' },
          { amount: '20.00' },
          { amount: '-10.00' },
        ],
        units: 10,
      },
    );

    const service = new ReportsService(prisma as PrismaService);
    const result = await service.getStakeholderProjectsReport({
      projectId: 501,
      stakeholderId: 10,
    });

    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      include: {
        product: true,
        sales: true,
        stakeholders: {
          include: { stakeholder: true, transactions: true },
          where: { idStakeholder: 10 },
        },
        transactions: true,
      },
      where: {
        idProject: 501,
        stakeholders: { some: { idStakeholder: 10 } },
      },
    });
    expect(result.sources).toEqual(['store', 'ecommerce', 'event']);
    expect(result.row).toEqual({
      calculatedCost: 33,
      ecommerce: { amount: 150, quantity: 1 },
      event: { amount: 0, quantity: 0 },
      netSalesTotal: 343,
      productImage: 'https://example.test/maple-shelf.jpg',
      productName: 'Maple Shelf',
      profit: 310,
      projectId: 501,
      projectProgress: 30,
      projectTotalCost: 110,
      stakeholder: {
        balance: 80.3,
        income: 205.8,
        investment: 100,
        payments: 125.5,
        stakePercentage: 60,
        stakeholderId: 10,
        stakeholderName: 'Alicia',
      },
      store: { amount: 200, quantity: 2 },
      surface: { amount: 0, quantity: 0 },
      totalFees: 7,
      totalSales: 350,
      totalUnits: 10,
      totalUnitsSold: 3,
      transactions: [],
      unitPrice: 11,
      unitsLeft: 7,
    });
  });

  it('returns an empty stakeholder project report when the stakeholder is not assigned to the project', async () => {
    jest.spyOn(prisma.project, 'findFirst').mockResolvedValue(null);

    const service = new ReportsService(prisma as PrismaService);
    const result = await service.getStakeholderProjectsReport({
      projectId: 501,
      stakeholderId: 99,
    });

    expect(result).toEqual({
      row: null,
      sources: ['store', 'ecommerce', 'event'],
    });
  });
});
