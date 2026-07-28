import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ImportBatchesService } from './import-batches.service';
import { ImportParserService } from './import-parser.service';
import { ImportValidatorService } from './import-validator.service';
import { SaleFeeCalculatorService } from '../sales/sale-fee-calculator.service';
import { SaleFinancialsCalculatorService } from '../sales/sale-financials-calculator.service';
import {
  publicProjectBaseSelect,
  publicProjectSummarySelect,
} from '../projects/project-public-select';
import {
  asPrismaService,
  asPrismaTransactionClient,
} from '../../test/prisma-service.mock';

type AsyncMock = (args: unknown) => Promise<unknown>;
type ImportBatchUpdateArgs = {
  where: unknown;
  data: Record<string, unknown>;
  include?: unknown;
};
type ImportBatchUpdateMock = (args: ImportBatchUpdateArgs) => Promise<unknown>;
type TransactionMock = (
  callback: (client: Prisma.TransactionClient) => Promise<unknown>,
) => Promise<unknown>;
type CalculateFeeMock = (
  row: {
    amount: unknown;
    idProject: number;
    quantity: unknown;
  },
  client?: unknown,
) => Promise<number>;
type CalculateFinancialsMock = (
  row: {
    amount: unknown;
    fee: unknown;
    idProduct: number;
  },
  client?: unknown,
) => Promise<{ ownerProfit: number; profit: number }>;

const batchDetailInclude = {
  _count: { select: { stageRows: true, errors: true } },
};
const importStageInclude = {
  product: {
    include: {
      projects: {
        orderBy: { idProject: 'asc' as const },
        select: publicProjectBaseSelect,
      },
    },
  },
  project: { select: publicProjectSummarySelect },
};

describe('ImportBatchesService', () => {
  const prisma = {
    $transaction: jest.fn<TransactionMock>(),
    $queryRaw: jest.fn<AsyncMock>(),
    importBatch: {
      findUnique: jest.fn<AsyncMock>(),
      update: jest.fn<ImportBatchUpdateMock>(),
    },
    importError: {
      count: jest.fn<AsyncMock>(),
      create: jest.fn<AsyncMock>(),
      createMany: jest.fn<AsyncMock>(),
      deleteMany: jest.fn<AsyncMock>(),
    },
    importStage: {
      findFirst: jest.fn<AsyncMock>(),
      findMany: jest.fn<AsyncMock>(),
      update: jest.fn<AsyncMock>(),
    },
    project: {
      findFirst: jest.fn<AsyncMock>(),
    },
    sale: {
      createMany: jest.fn<AsyncMock>(),
    },
  };
  const parse = jest.fn<ImportParserService['parse']>();
  const validateRows = jest.fn<ImportValidatorService['validateRows']>();
  const calculateFee = jest.fn<CalculateFeeMock>();
  const calculateFinancials = jest.fn<CalculateFinancialsMock>();
  const parser = {
    parse,
  } as unknown as ImportParserService;
  const validator = {
    validateRows,
  } as unknown as ImportValidatorService;
  const feeCalculator = {
    calculateFee,
  } as unknown as SaleFeeCalculatorService;
  const financialsCalculator = {
    calculateFinancials,
  } as unknown as SaleFinancialsCalculatorService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: Parameters<TransactionMock>[0]) =>
        callback(asPrismaTransactionClient(prisma)),
    );
    calculateFee.mockImplementation((row: Parameters<CalculateFeeMock>[0]) =>
      Promise.resolve(row.idProject === 70 ? 7.63 : 1.2),
    );
    calculateFinancials.mockImplementation(
      (row: Parameters<CalculateFinancialsMock>[0]) =>
        Promise.resolve(
          row.idProduct === 7
            ? { ownerProfit: 5.72, profit: 22.87 }
            : { ownerProfit: 1.08, profit: 10.8 },
        ),
    );
  });

  function buildService() {
    return new ImportBatchesService(
      asPrismaService(prisma),
      parser,
      validator,
      feeCalculator,
      financialsCalculator,
    );
  }

  it('rejects commit when import date is missing', async () => {
    prisma.importBatch.findUnique.mockResolvedValue({
      idImportBatch: 1,
      status: 'validated',
      importDate: null,
      source: 'store',
    });
    const service = buildService();

    await expect(service.commit(1)).rejects.toThrow(
      new BadRequestException('Import date is required before commit'),
    );
    expect(prisma.sale.createMany).not.toHaveBeenCalled();
  });

  it('updates a staged row project when the project belongs to the matched product', async () => {
    prisma.importBatch.findUnique.mockResolvedValue({
      idImportBatch: 1,
      status: 'has_errors',
    });
    prisma.importStage.findFirst.mockResolvedValue({
      idImportStage: 10,
      idImportBatch: 1,
      idProduct: 7,
    });
    prisma.project.findFirst.mockResolvedValue({
      idProject: 70,
      idProduct: 7,
    });
    prisma.importStage.update.mockResolvedValue({
      idImportStage: 10,
      idProject: 70,
    });
    const service = buildService();

    await service.updateStageRow(1, 10, { idProject: 70 });

    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { idProject: 70, idProduct: 7 },
      select: { idProject: true },
    });
    expect(prisma.importStage.update).toHaveBeenCalledWith({
      where: { idImportStage: 10 },
      data: { idProject: 70 },
      include: importStageInclude,
    });
  });

  it('rejects commit with incomplete staged rows without creating sales', async () => {
    prisma.importBatch.findUnique.mockResolvedValue({
      idImportBatch: 1,
      status: 'validated',
      importDate: new Date('2026-05-05T00:00:00.000Z'),
      source: 'store',
    });
    prisma.importStage.findMany.mockResolvedValue([]);
    const service = buildService();

    await expect(service.commit(1)).rejects.toThrow(
      new BadRequestException('Batch has incomplete staged rows'),
    );
    expect(prisma.sale.createMany).not.toHaveBeenCalled();
  });

  it('creates sales with selected import date, batch source, calculated fee, and persisted profit fields on commit', async () => {
    const importDate = new Date('2026-05-05T00:00:00.000Z');
    prisma.importBatch.findUnique.mockResolvedValue({
      idImportBatch: 1,
      status: 'validated',
      importDate,
      source: 'event',
    });
    prisma.importError.count.mockResolvedValue(0);
    prisma.importStage.findMany.mockResolvedValue([
      {
        idImportStage: 10,
        rowNumber: 1,
        externalProductId: 'EV-7',
        importedProductDescription: 'Ticket',
        idProduct: 70,
        idProject: 70,
        quantity: 2,
        amount: '30.50',
        rawRow: { id: 'EV-7' },
      },
      {
        idImportStage: 11,
        rowNumber: 2,
        externalProductId: 'EV-8',
        importedProductDescription: 'Pass',
        idProduct: 80,
        idProject: 80,
        quantity: 1,
        amount: 12,
        rawRow: { id: 'EV-8' },
      },
    ]);
    validateRows.mockResolvedValue({
      stageRows: [
        {
          rowNumber: 1,
          externalProductId: 'EV-7',
          importedProductDescription: 'Ticket',
          quantity: 2,
          amount: 30.5,
          rawRow: { id: 'EV-7' },
          idProduct: 7,
          idProject: 70,
        },
        {
          rowNumber: 2,
          externalProductId: 'EV-8',
          importedProductDescription: 'Pass',
          quantity: 1,
          amount: 12,
          rawRow: { id: 'EV-8' },
          idProduct: 8,
          idProject: 80,
        },
      ],
      errors: [],
    });
    prisma.importStage.update.mockResolvedValue({
      idImportStage: 10,
    });
    prisma.importError.deleteMany.mockResolvedValue({ count: 0 });
    prisma.sale.createMany.mockResolvedValue({ count: 2 });
    prisma.importBatch.update.mockResolvedValue({
      idImportBatch: 1,
      status: 'committed',
      importDate,
      source: 'event',
    });
    const service = buildService();

    await service.commit(1);

    expect(validateRows).toHaveBeenCalledWith(
      'event',
      [
        {
          rowNumber: 1,
          externalProductId: 'EV-7',
          importedProductDescription: 'Ticket',
          quantity: 2,
          amount: 30.5,
          rawRow: { id: 'EV-7' },
          idProject: 70,
        },
        {
          rowNumber: 2,
          externalProductId: 'EV-8',
          importedProductDescription: 'Pass',
          quantity: 1,
          amount: 12,
          rawRow: { id: 'EV-8' },
          idProject: 80,
        },
      ],
      prisma,
    );
    expect(prisma.importStage.update).toHaveBeenCalledWith({
      where: { idImportStage: 10 },
      data: {
        externalProductId: 'EV-7',
        importedProductDescription: 'Ticket',
        quantity: 2,
        amount: 30.5,
        idProduct: 7,
        idProject: 70,
      },
    });
    expect(prisma.sale.createMany).toHaveBeenCalledWith({
      data: [
        {
          date: importDate,
          source: 'event',
          idProduct: 7,
          idProject: 70,
          quantity: 2,
          amount: 30.5,
          fee: 7.63,
          feeOverride: false,
          ownerProfit: 5.72,
          profit: 22.87,
        },
        {
          date: importDate,
          source: 'event',
          idProduct: 8,
          idProject: 80,
          quantity: 1,
          amount: 12,
          fee: 1.2,
          feeOverride: false,
          ownerProfit: 1.08,
          profit: 10.8,
        },
      ],
    });
    expect(calculateFee).toHaveBeenCalledWith(
      {
        amount: 30.5,
        idProject: 70,
        quantity: 2,
      },
      prisma,
    );
    expect(calculateFinancials).toHaveBeenCalledWith(
      {
        amount: 30.5,
        fee: 7.63,
        idProduct: 7,
      },
      prisma,
    );
    expect(calculateFinancials).toHaveBeenCalledWith(
      {
        amount: 12,
        fee: 1.2,
        idProduct: 8,
      },
      prisma,
    );
    expect(calculateFee).toHaveBeenCalledWith(
      {
        amount: 12,
        idProject: 80,
        quantity: 1,
      },
      prisma,
    );
    expect(prisma.importBatch.update).toHaveBeenCalledWith({
      where: { idImportBatch: 1 },
      data: {
        status: 'committed',
        committedAt: expect.any(Date) as unknown,
      },
      include: batchDetailInclude,
    });
  });

  it('persists fresh validation errors and rejects commit when revalidation fails', async () => {
    const importDate = new Date('2026-05-05T00:00:00.000Z');
    prisma.importBatch.findUnique.mockResolvedValue({
      idImportBatch: 1,
      status: 'validated',
      importDate,
      source: 'store',
    });
    prisma.importError.count.mockResolvedValue(0);
    prisma.importStage.findMany.mockResolvedValue([
      {
        idImportStage: 10,
        rowNumber: 1,
        externalProductId: 'S-7',
        importedProductDescription: 'Shirt',
        idProduct: 7,
        idProject: 70,
        quantity: 2,
        amount: '30.50',
        rawRow: { id: 'S-7' },
      },
    ]);
    validateRows.mockResolvedValue({
      stageRows: [
        {
          rowNumber: 1,
          externalProductId: 'S-7',
          importedProductDescription: 'Shirt',
          quantity: 2,
          amount: 30.5,
          rawRow: { id: 'S-7' },
          idProduct: null,
          idProject: null,
        },
      ],
      errors: [
        {
          rowNumber: 1,
          field: 'externalProductId',
          message: 'No product matched external ID S-7 for source store',
        },
      ],
    });
    prisma.importStage.update.mockResolvedValue({ idImportStage: 10 });
    prisma.importError.deleteMany.mockResolvedValue({ count: 0 });
    prisma.importError.createMany.mockResolvedValue({ count: 1 });
    prisma.importBatch.update.mockResolvedValue({
      idImportBatch: 1,
      status: 'has_errors',
    });
    const service = buildService();

    await expect(service.commit(1)).rejects.toThrow(
      new BadRequestException('Batch has validation errors'),
    );

    expect(prisma.importStage.update).toHaveBeenCalledWith({
      where: { idImportStage: 10 },
      data: {
        externalProductId: 'S-7',
        importedProductDescription: 'Shirt',
        quantity: 2,
        amount: 30.5,
        idProduct: null,
        idProject: null,
      },
    });
    expect(prisma.importError.deleteMany).toHaveBeenCalledWith({
      where: { idImportBatch: 1 },
    });
    expect(prisma.importError.createMany).toHaveBeenCalledWith({
      data: [
        {
          idImportBatch: 1,
          rowNumber: 1,
          field: 'externalProductId',
          message: 'No product matched external ID S-7 for source store',
          idImportStage: 10,
        },
      ],
    });
    expect(prisma.importBatch.update).toHaveBeenCalledWith({
      where: { idImportBatch: 1 },
      data: { status: 'has_errors' },
      include: batchDetailInclude,
    });
    expect(prisma.sale.createMany).not.toHaveBeenCalled();
  });

  it('rejects commit when status is not validated even if errors were cleared', async () => {
    const importDate = new Date('2026-05-05T00:00:00.000Z');
    prisma.importBatch.findUnique.mockResolvedValue({
      idImportBatch: 1,
      status: 'has_errors',
      importDate,
      source: 'store',
    });
    prisma.importError.count.mockResolvedValue(0);
    prisma.importStage.findMany.mockResolvedValue([
      {
        idImportStage: 10,
        externalProductId: 'S-7',
        importedProductDescription: 'Shirt',
        idProduct: 7,
        quantity: 2,
        amount: '30.50',
      },
    ]);
    const service = buildService();

    await expect(service.commit(1)).rejects.toThrow(
      new BadRequestException('Import batch must be validated before commit'),
    );
    expect(prisma.sale.createMany).not.toHaveBeenCalled();
  });

  it('locks the import batch row before commit reads or creates sales', async () => {
    const importDate = new Date('2026-05-05T00:00:00.000Z');
    prisma.importBatch.findUnique.mockResolvedValue({
      idImportBatch: 1,
      status: 'validated',
      importDate,
      source: 'event',
    });
    prisma.importError.count.mockResolvedValue(0);
    prisma.importStage.findMany.mockResolvedValue([
      {
        idImportStage: 10,
        rowNumber: 1,
        externalProductId: 'EV-7',
        importedProductDescription: 'Ticket',
        idProduct: 7,
        idProject: 70,
        quantity: 2,
        amount: '30.50',
        rawRow: { id: 'EV-7' },
      },
    ]);
    validateRows.mockResolvedValue({
      stageRows: [
        {
          rowNumber: 1,
          externalProductId: 'EV-7',
          importedProductDescription: 'Ticket',
          quantity: 2,
          amount: 30.5,
          rawRow: { id: 'EV-7' },
          idProduct: 7,
          idProject: 70,
        },
      ],
      errors: [],
    });
    prisma.importStage.update.mockResolvedValue({
      idImportStage: 10,
    });
    prisma.importError.deleteMany.mockResolvedValue({ count: 0 });
    prisma.sale.createMany.mockResolvedValue({ count: 1 });
    prisma.importBatch.update.mockResolvedValue({
      idImportBatch: 1,
      status: 'committed',
      importDate,
      source: 'event',
    });
    const service = buildService();

    await service.commit(1);

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.importBatch.findUnique.mock.invocationCallOrder[0],
    );
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.sale.createMany.mock.invocationCallOrder[0],
    );
  });

  it('marks validated batches with a source-change error before commit can use stale product matches', async () => {
    prisma.importBatch.findUnique.mockResolvedValue({
      idImportBatch: 1,
      status: 'validated',
      source: 'store',
      importDate: new Date('2026-05-05T00:00:00.000Z'),
      _count: { stageRows: 1, errors: 0 },
    });
    prisma.importError.deleteMany.mockResolvedValue({ count: 0 });
    prisma.importError.create.mockResolvedValue({
      idImportError: 20,
    });
    prisma.importBatch.update.mockResolvedValue({
      idImportBatch: 1,
      status: 'has_errors',
      source: 'event',
    });
    const service = buildService();

    await service.update(1, { source: 'event' });

    expect(prisma.importBatch.update).toHaveBeenCalledWith({
      where: { idImportBatch: 1 },
      data: { source: 'event', status: 'has_errors' },
      include: batchDetailInclude,
    });
    expect(prisma.importError.create).toHaveBeenCalledWith({
      data: {
        idImportBatch: 1,
        rowNumber: null,
        field: 'source',
        message:
          'Source changed from store to event; validate before committing',
      },
    });
  });

  it('locks and reads the batch with stage rows inside validate transaction', async () => {
    prisma.importBatch.findUnique.mockResolvedValue({
      idImportBatch: 1,
      status: 'has_errors',
      source: 'store',
      stageRows: [
        {
          idImportStage: 10,
          rowNumber: 2,
          externalProductId: 'S-7',
          importedProductDescription: 'Shirt',
          idProject: 70,
          quantity: 2,
          amount: '30.50',
          rawRow: { id: 'S-7' },
        },
      ],
    });
    validateRows.mockResolvedValue({
      stageRows: [
        {
          rowNumber: 2,
          externalProductId: 'S-7',
          importedProductDescription: 'Shirt',
          quantity: 2,
          amount: 30.5,
          rawRow: { id: 'S-7' },
          idProduct: 7,
          idProject: 70,
        },
      ],
      errors: [],
    });
    prisma.importStage.update.mockResolvedValue({
      idImportStage: 10,
    });
    prisma.importError.deleteMany.mockResolvedValue({ count: 1 });
    prisma.importBatch.update.mockResolvedValue({
      idImportBatch: 1,
      status: 'validated',
    });
    const service = buildService();

    await service.validate(1);

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.importBatch.findUnique).toHaveBeenCalledWith({
      where: { idImportBatch: 1 },
      include: { stageRows: { orderBy: { rowNumber: 'asc' } } },
    });
    expect(prisma.$transaction.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.importBatch.findUnique.mock.invocationCallOrder[0],
    );
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.importBatch.findUnique.mock.invocationCallOrder[0],
    );
    expect(
      prisma.importBatch.findUnique.mock.invocationCallOrder[0],
    ).toBeLessThan(prisma.importError.deleteMany.mock.invocationCallOrder[0]);
  });

  it('locks and rereads before cancelling and rejects committed batches', async () => {
    prisma.importBatch.findUnique.mockResolvedValue({
      idImportBatch: 1,
      status: 'committed',
      _count: { stageRows: 1, errors: 0 },
    });
    const service = buildService();

    await expect(service.cancel(1)).rejects.toThrow(
      new BadRequestException('Committed batches cannot be cancelled'),
    );

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.importBatch.findUnique).toHaveBeenCalledWith({
      where: { idImportBatch: 1 },
      include: batchDetailInclude,
    });
    expect(prisma.importBatch.update).not.toHaveBeenCalled();
    expect(prisma.$transaction.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.importBatch.findUnique.mock.invocationCallOrder[0],
    );
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.importBatch.findUnique.mock.invocationCallOrder[0],
    );
  });
});
