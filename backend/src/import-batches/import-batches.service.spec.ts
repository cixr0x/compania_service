import { BadRequestException } from '@nestjs/common';
import { ImportBatchesService } from './import-batches.service';
import { ImportParserService } from './import-parser.service';
import { ImportValidatorService } from './import-validator.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ImportBatchesService', () => {
  const prisma = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    importBatch: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    importError: {
      count: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    importStage: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    sale: {
      createMany: jest.fn(),
    },
  } as any;
  const parser = {} as ImportParserService;
  const validator = {
    validateRows: jest.fn(),
  } as any as ImportValidatorService;

  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .spyOn(prisma, '$transaction')
      .mockImplementation(async (callback) => callback(prisma));
  });

  it('rejects commit when import date is missing', async () => {
    jest.spyOn(prisma.importBatch, 'findUnique').mockResolvedValue({
      idImportBatch: 1,
      status: 'validated',
      importDate: null,
      source: 'store',
    });
    const service = new ImportBatchesService(
      prisma as PrismaService,
      parser,
      validator,
    );

    await expect(service.commit(1)).rejects.toThrow(
      new BadRequestException('Import date is required before commit'),
    );
    expect(prisma.sale.createMany).not.toHaveBeenCalled();
  });

  it('rejects commit with incomplete staged rows without creating sales', async () => {
    jest.spyOn(prisma.importBatch, 'findUnique').mockResolvedValue({
      idImportBatch: 1,
      status: 'validated',
      importDate: new Date('2026-05-05T00:00:00.000Z'),
      source: 'store',
    });
    jest.spyOn(prisma.importStage, 'findMany').mockResolvedValue([]);
    const service = new ImportBatchesService(
      prisma as PrismaService,
      parser,
      validator,
    );

    await expect(service.commit(1)).rejects.toThrow(
      new BadRequestException('Batch has incomplete staged rows'),
    );
    expect(prisma.sale.createMany).not.toHaveBeenCalled();
  });

  it('creates sales with selected import date, batch source, fee zero, tax zero, and tax pct zero on commit', async () => {
    const importDate = new Date('2026-05-05T00:00:00.000Z');
    jest.spyOn(prisma.importBatch, 'findUnique').mockResolvedValue({
      idImportBatch: 1,
      status: 'validated',
      importDate,
      source: 'event',
    });
    jest.spyOn(prisma.importError, 'count').mockResolvedValue(0);
    jest.spyOn(prisma.importStage, 'findMany').mockResolvedValue([
      {
        idImportStage: 10,
        rowNumber: 1,
        externalProductId: 'EV-7',
        importedProductDescription: 'Ticket',
        idProduct: 70,
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
        quantity: 1,
        amount: 12,
        rawRow: { id: 'EV-8' },
      },
    ]);
    jest.spyOn(validator, 'validateRows').mockResolvedValue({
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
    jest.spyOn(prisma.importStage, 'update').mockResolvedValue({
      idImportStage: 10,
    });
    jest
      .spyOn(prisma.importError, 'deleteMany')
      .mockResolvedValue({ count: 0 });
    jest.spyOn(prisma.sale, 'createMany').mockResolvedValue({ count: 2 });
    jest.spyOn(prisma.importBatch, 'update').mockResolvedValue({
      idImportBatch: 1,
      status: 'committed',
      importDate,
      source: 'event',
    });
    const service = new ImportBatchesService(
      prisma as PrismaService,
      parser,
      validator,
    );

    await service.commit(1);

    expect(validator.validateRows).toHaveBeenCalledWith(
      'event',
      [
        {
          rowNumber: 1,
          externalProductId: 'EV-7',
          importedProductDescription: 'Ticket',
          quantity: 2,
          amount: 30.5,
          rawRow: { id: 'EV-7' },
        },
        {
          rowNumber: 2,
          externalProductId: 'EV-8',
          importedProductDescription: 'Pass',
          quantity: 1,
          amount: 12,
          rawRow: { id: 'EV-8' },
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
          fee: 0,
          tax: 0,
          taxPct: 0,
        },
        {
          date: importDate,
          source: 'event',
          idProduct: 8,
          idProject: 80,
          quantity: 1,
          amount: 12,
          fee: 0,
          tax: 0,
          taxPct: 0,
        },
      ],
    });
    expect(prisma.importBatch.update).toHaveBeenCalledWith({
      where: { idImportBatch: 1 },
      data: { status: 'committed', committedAt: expect.any(Date) },
      include: expect.any(Object),
    });
  });

  it('persists fresh validation errors and rejects commit when revalidation fails', async () => {
    const importDate = new Date('2026-05-05T00:00:00.000Z');
    jest.spyOn(prisma.importBatch, 'findUnique').mockResolvedValue({
      idImportBatch: 1,
      status: 'validated',
      importDate,
      source: 'store',
    });
    jest.spyOn(prisma.importError, 'count').mockResolvedValue(0);
    jest.spyOn(prisma.importStage, 'findMany').mockResolvedValue([
      {
        idImportStage: 10,
        rowNumber: 1,
        externalProductId: 'S-7',
        importedProductDescription: 'Shirt',
        idProduct: 7,
        quantity: 2,
        amount: '30.50',
        rawRow: { id: 'S-7' },
      },
    ]);
    jest.spyOn(validator, 'validateRows').mockResolvedValue({
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
    jest
      .spyOn(prisma.importStage, 'update')
      .mockResolvedValue({ idImportStage: 10 });
    jest
      .spyOn(prisma.importError, 'deleteMany')
      .mockResolvedValue({ count: 0 });
    jest
      .spyOn(prisma.importError, 'createMany')
      .mockResolvedValue({ count: 1 });
    jest.spyOn(prisma.importBatch, 'update').mockResolvedValue({
      idImportBatch: 1,
      status: 'has_errors',
    });
    const service = new ImportBatchesService(
      prisma as PrismaService,
      parser,
      validator,
    );

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
      include: expect.any(Object),
    });
    expect(prisma.sale.createMany).not.toHaveBeenCalled();
  });

  it('rejects commit when status is not validated even if errors were cleared', async () => {
    const importDate = new Date('2026-05-05T00:00:00.000Z');
    jest.spyOn(prisma.importBatch, 'findUnique').mockResolvedValue({
      idImportBatch: 1,
      status: 'has_errors',
      importDate,
      source: 'store',
    });
    jest.spyOn(prisma.importError, 'count').mockResolvedValue(0);
    jest.spyOn(prisma.importStage, 'findMany').mockResolvedValue([
      {
        idImportStage: 10,
        externalProductId: 'S-7',
        importedProductDescription: 'Shirt',
        idProduct: 7,
        quantity: 2,
        amount: '30.50',
      },
    ]);
    const service = new ImportBatchesService(
      prisma as PrismaService,
      parser,
      validator,
    );

    await expect(service.commit(1)).rejects.toThrow(
      new BadRequestException('Import batch must be validated before commit'),
    );
    expect(prisma.sale.createMany).not.toHaveBeenCalled();
  });

  it('locks the import batch row before commit reads or creates sales', async () => {
    const importDate = new Date('2026-05-05T00:00:00.000Z');
    jest.spyOn(prisma.importBatch, 'findUnique').mockResolvedValue({
      idImportBatch: 1,
      status: 'validated',
      importDate,
      source: 'event',
    });
    jest.spyOn(prisma.importError, 'count').mockResolvedValue(0);
    jest.spyOn(prisma.importStage, 'findMany').mockResolvedValue([
      {
        idImportStage: 10,
        rowNumber: 1,
        externalProductId: 'EV-7',
        importedProductDescription: 'Ticket',
        idProduct: 7,
        quantity: 2,
        amount: '30.50',
        rawRow: { id: 'EV-7' },
      },
    ]);
    jest.spyOn(validator, 'validateRows').mockResolvedValue({
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
    jest.spyOn(prisma.importStage, 'update').mockResolvedValue({
      idImportStage: 10,
    });
    jest
      .spyOn(prisma.importError, 'deleteMany')
      .mockResolvedValue({ count: 0 });
    jest.spyOn(prisma.sale, 'createMany').mockResolvedValue({ count: 1 });
    jest.spyOn(prisma.importBatch, 'update').mockResolvedValue({
      idImportBatch: 1,
      status: 'committed',
      importDate,
      source: 'event',
    });
    const service = new ImportBatchesService(
      prisma as PrismaService,
      parser,
      validator,
    );

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
    jest.spyOn(prisma.importBatch, 'findUnique').mockResolvedValue({
      idImportBatch: 1,
      status: 'validated',
      source: 'store',
      importDate: new Date('2026-05-05T00:00:00.000Z'),
      _count: { stageRows: 1, errors: 0 },
    });
    jest
      .spyOn(prisma.importError, 'deleteMany')
      .mockResolvedValue({ count: 0 });
    jest.spyOn(prisma.importError, 'create').mockResolvedValue({
      idImportError: 20,
    });
    jest.spyOn(prisma.importBatch, 'update').mockResolvedValue({
      idImportBatch: 1,
      status: 'has_errors',
      source: 'event',
    });
    const service = new ImportBatchesService(
      prisma as PrismaService,
      parser,
      validator,
    );

    await service.update(1, { source: 'event' });

    expect(prisma.importBatch.update).toHaveBeenCalledWith({
      where: { idImportBatch: 1 },
      data: { source: 'event', status: 'has_errors' },
      include: expect.any(Object),
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
    jest.spyOn(prisma.importBatch, 'findUnique').mockResolvedValue({
      idImportBatch: 1,
      status: 'has_errors',
      source: 'store',
      stageRows: [
        {
          idImportStage: 10,
          rowNumber: 2,
          externalProductId: 'S-7',
          importedProductDescription: 'Shirt',
          quantity: 2,
          amount: '30.50',
          rawRow: { id: 'S-7' },
        },
      ],
    });
    jest.spyOn(validator, 'validateRows').mockResolvedValue({
      stageRows: [
        {
          rowNumber: 2,
          externalProductId: 'S-7',
          importedProductDescription: 'Shirt',
          quantity: 2,
          amount: 30.5,
          rawRow: { id: 'S-7' },
          idProduct: 7,
        },
      ],
      errors: [],
    });
    jest.spyOn(prisma.importStage, 'update').mockResolvedValue({
      idImportStage: 10,
    });
    jest
      .spyOn(prisma.importError, 'deleteMany')
      .mockResolvedValue({ count: 1 });
    jest.spyOn(prisma.importBatch, 'update').mockResolvedValue({
      idImportBatch: 1,
      status: 'validated',
    });
    const service = new ImportBatchesService(
      prisma as PrismaService,
      parser,
      validator,
    );

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
    jest.spyOn(prisma.importBatch, 'findUnique').mockResolvedValue({
      idImportBatch: 1,
      status: 'committed',
      _count: { stageRows: 1, errors: 0 },
    });
    const service = new ImportBatchesService(
      prisma as PrismaService,
      parser,
      validator,
    );

    await expect(service.cancel(1)).rejects.toThrow(
      new BadRequestException('Committed batches cannot be cancelled'),
    );

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.importBatch.findUnique).toHaveBeenCalledWith({
      where: { idImportBatch: 1 },
      include: expect.any(Object),
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
