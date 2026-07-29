import { ReportsService } from './reports.service';
import { asPrismaService } from '../../test/prisma-service.mock';

describe('ReportsService', () => {
  const prisma = {
    project: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    sale: {
      findMany: jest.fn(),
    },
  };

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

    const service = new ReportsService(asPrismaService(prisma));
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
          name: 'Maple Shelf Launch',
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
          name: 'Maple Shelf Launch',
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
          name: 'Maple Shelf Holiday Run',
          productionCost: '70.00',
        },
        quantity: 3,
        source: 'event',
      },
    ]);

    const service = new ReportsService(asPrismaService(prisma));
    const result = await service.getSalesSummary({ year: 2026, month: 5 });

    expect(prisma.sale.findMany).toHaveBeenCalledWith({
      include: {
        product: true,
        project: true,
      },
      orderBy: [{ project: { name: 'asc' } }, { idProject: 'asc' }],
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
        ecommerce: { amount: 150, averagePrice: 150, quantity: 1 },
        event: { amount: 0, averagePrice: 0, quantity: 0 },
        fee: 7,
        ownerProfit: 82.5,
        productId: 42,
        productImage: 'https://example.test/maple-shelf.jpg',
        productName: 'Maple Shelf',
        profit: 330,
        projectId: 501,
        projectName: 'Maple Shelf Launch',
        stakeholderIncome: null,
        stakePercentage: null,
        store: { amount: 200, averagePrice: 100, quantity: 2 },
        surface: { amount: 0, averagePrice: 0, quantity: 0 },
        totalAmount: 350,
        totalAveragePrice: 116.67,
        totalQuantity: 3,
      },
      {
        ecommerce: { amount: 0, averagePrice: 0, quantity: 0 },
        event: { amount: 300, averagePrice: 100, quantity: 3 },
        fee: 10,
        ownerProfit: 65,
        productId: 42,
        productImage: 'https://example.test/maple-shelf.jpg',
        productName: 'Maple Shelf',
        profit: 260,
        projectId: 502,
        projectName: 'Maple Shelf Holiday Run',
        stakeholderIncome: null,
        stakePercentage: null,
        store: { amount: 0, averagePrice: 0, quantity: 0 },
        surface: { amount: 0, averagePrice: 0, quantity: 0 },
        totalAmount: 300,
        totalAveragePrice: 100,
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
          name: 'Event Kit Surface Run',
          productionCost: '20.00',
        },
        quantity: 4,
        source: 'surface',
      },
    ]);

    const service = new ReportsService(asPrismaService(prisma));
    const result = await service.getSalesSummary({ year: 2026 });

    expect(result.sources).toEqual(['store', 'ecommerce', 'event', 'surface']);
    expect(result.rows[0].surface).toEqual({
      amount: 80,
      averagePrice: 20,
      quantity: 4,
    });
    expect(result.rows[0].totalAveragePrice).toBe(20);
  });

  it('includes every assigned project and calculates period income for a selected stakeholder', async () => {
    jest.spyOn(prisma.project, 'findMany').mockResolvedValue([
      {
        idProject: 501,
        name: 'Maple Shelf Launch',
        product: {
          id: 42,
          image: 'https://example.test/maple-shelf.jpg',
          name: 'Maple Shelf',
        },
        stakeholders: [{ stakePercentage: '60.00' }],
      },
      {
        idProject: 503,
        name: 'Maple Shelf Reserve',
        product: {
          id: 42,
          image: 'https://example.test/maple-shelf.jpg',
          name: 'Maple Shelf',
        },
        stakeholders: [{ stakePercentage: '25.00' }],
      },
    ]);
    jest.spyOn(prisma.sale, 'findMany').mockResolvedValue([
      {
        amount: '350.00',
        fee: '7.00',
        idProject: 501,
        ownerProfit: '85.75',
        product: {
          id: 42,
          image: 'https://example.test/maple-shelf.jpg',
          name: 'Maple Shelf',
        },
        profit: '330.00',
        project: {
          idProject: 501,
          name: 'Maple Shelf Launch',
        },
        quantity: 3,
        source: 'store',
      },
    ]);

    const service = new ReportsService(asPrismaService(prisma));
    const result = await service.getSalesSummary({
      year: 2026,
      stakeholderId: 10,
    });

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      orderBy: [{ name: 'asc' }, { idProject: 'asc' }],
      select: {
        idProject: true,
        name: true,
        product: true,
        stakeholders: {
          select: { stakePercentage: true },
          where: { idStakeholder: 10 },
        },
      },
      where: {
        stakeholders: {
          some: { idStakeholder: 10 },
        },
      },
    });
    expect(prisma.sale.findMany).toHaveBeenCalledWith({
      include: {
        product: true,
        project: true,
      },
      orderBy: [{ project: { name: 'asc' } }, { idProject: 'asc' }],
      where: {
        date: {
          gte: new Date('2026-01-01T00:00:00.000Z'),
          lt: new Date('2027-01-01T00:00:00.000Z'),
        },
        idProject: { in: [501, 503] },
      },
    });
    expect(result.sources).toEqual(['store', 'ecommerce', 'event']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        fee: 7,
        projectId: 501,
        projectName: 'Maple Shelf Launch',
        stakeholderIncome: 205.8,
        stakePercentage: 60,
        totalAmount: 350,
        totalQuantity: 3,
      }),
    );
    expect(result.rows[1]).toEqual(
      expect.objectContaining({
        fee: 0,
        projectId: 503,
        projectName: 'Maple Shelf Reserve',
        stakeholderIncome: 0,
        stakePercentage: 25,
        totalAmount: 0,
        totalQuantity: 0,
      }),
    );
  });

  it('builds an all-time stakeholder project report for one project stakeholder', async () => {
    jest.spyOn(prisma.project, 'findFirst').mockResolvedValue({
      adminCost: '20.00',
      costAdjustment: '-10.00',
      fixedRoi: false,
      fixedRoiPercentage: null,
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
            { amount: '100.00', transactionType: 'investment' },
            { amount: '125.50', transactionType: 'payment' },
            { amount: '15.25', transactionType: 'adjustment' },
            { amount: '-5.00', transactionType: 'adjustment' },
          ],
        },
      ],
      transactions: [
        { amount: '100.00' },
        { amount: '20.00' },
        { amount: '-10.00' },
      ],
      units: 10,
    });

    const service = new ReportsService(asPrismaService(prisma));
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
      fixedRoi: false,
      fixedRoiPercentage: null,
      fixedRoiProfit: null,
      netSalesTotal: 343,
      productImage: 'https://example.test/maple-shelf.jpg',
      productName: 'Maple Shelf',
      profit: 310,
      profitDifference: null,
      projectId: 501,
      projectProgress: 30,
      projectTotalCost: 110,
      stakeholder: {
        adjustmentCount: 2,
        adjustments: 10.25,
        balance: 90.55,
        income: 205.8,
        investment: 25.5,
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

  it('uses the fixed project ROI for stakeholder income and profit metrics', async () => {
    jest.spyOn(prisma.project, 'findFirst').mockResolvedValue({
      fixedRoi: true,
      fixedRoiPercentage: '20.00',
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
            { amount: '100.00', transactionType: 'investment' },
            { amount: '125.50', transactionType: 'payment' },
            { amount: '15.25', transactionType: 'adjustment' },
            { amount: '-5.00', transactionType: 'adjustment' },
          ],
        },
      ],
      transactions: [
        { amount: '100.00' },
        { amount: '20.00' },
        { amount: '-10.00' },
      ],
      units: 10,
    });

    const service = new ReportsService(asPrismaService(prisma));
    const result = await service.getStakeholderProjectsReport({
      projectId: 501,
      stakeholderId: 10,
    });

    expect(result.row?.calculatedCost).toBe(33);
    expect(result.row?.fixedRoi).toBe(true);
    expect(result.row?.fixedRoiPercentage).toBe(20);
    expect(result.row?.fixedRoiProfit).toBe(6.6);
    expect(result.row?.profit).toBe(310);
    expect(result.row?.profitDifference).toBe(303.4);
    expect(result.row?.stakeholder.balance).toBe(-111.29);
    expect(result.row?.stakeholder.income).toBe(3.96);
  });

  it('returns an empty stakeholder project report when the stakeholder is not assigned to the project', async () => {
    jest.spyOn(prisma.project, 'findFirst').mockResolvedValue(null);

    const service = new ReportsService(asPrismaService(prisma));
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
