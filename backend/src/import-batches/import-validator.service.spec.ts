import {
  ImportValidatorService,
  ParsedImportRow,
} from './import-validator.service';
import { PrismaService } from '../prisma/prisma.service';

type ProductFindManyMock = (args: unknown) => Promise<unknown[]>;

describe('ImportValidatorService', () => {
  const productFindMany = jest.fn<ProductFindManyMock>();
  const prisma = {
    product: {
      findMany: productFindMany,
    },
  } as unknown as PrismaService;

  beforeEach(() => jest.resetAllMocks());

  it('matches ecommerce external IDs to product.idEcommerce', async () => {
    productFindMany.mockResolvedValue([
      { id: 7, idEcommerce: 'EC-7', projects: [{ idProject: 70 }] },
    ]);
    const service = new ImportValidatorService(prisma);

    const result = await service.validateRows('ecommerce', [
      row({ externalProductId: 'EC-7' }),
    ]);

    expect(productFindMany).toHaveBeenCalledWith({
      where: { idEcommerce: { in: ['EC-7'] } },
      select: {
        id: true,
        idEcommerce: true,
        projects: {
          select: { idProject: true },
        },
      },
    });
    expect(result.stageRows).toMatchObject([{ idProduct: 7, idProject: 70 }]);
    expect(result.errors).toEqual([]);
  });

  it('creates an error when a matched product has no project', async () => {
    productFindMany.mockResolvedValue([
      { id: 7, idStore: 'S-7', projects: [] },
    ]);
    const service = new ImportValidatorService(prisma);

    const result = await service.validateRows('store', [
      row({ rowNumber: 3, externalProductId: 'S-7' }),
    ]);

    expect(result.stageRows).toMatchObject([
      { rowNumber: 3, idProduct: 7, idProject: null },
    ]);
    expect(result.errors).toEqual([
      {
        rowNumber: 3,
        field: 'idProject',
        message: 'Matched product S-7 does not have any projects',
      },
    ]);
  });

  it('requires project selection when a matched product has multiple projects', async () => {
    productFindMany.mockResolvedValue([
      {
        id: 7,
        idStore: 'S-7',
        projects: [{ idProject: 70 }, { idProject: 71 }],
      },
    ]);
    const service = new ImportValidatorService(prisma);

    const result = await service.validateRows('store', [
      row({ rowNumber: 3, externalProductId: 'S-7' }),
    ]);

    expect(result.stageRows).toMatchObject([
      { rowNumber: 3, idProduct: 7, idProject: null },
    ]);
    expect(result.errors).toEqual([
      {
        rowNumber: 3,
        field: 'idProject',
        message: 'Select a project for matched product S-7',
      },
    ]);
  });

  it('preserves a valid selected project when a matched product has multiple projects', async () => {
    productFindMany.mockResolvedValue([
      {
        id: 7,
        idStore: 'S-7',
        projects: [{ idProject: 70 }, { idProject: 71 }],
      },
    ]);
    const service = new ImportValidatorService(prisma);

    const result = await service.validateRows('store', [
      { ...row({ rowNumber: 3, externalProductId: 'S-7' }), idProject: 71 },
    ]);

    expect(result.stageRows).toMatchObject([
      { rowNumber: 3, idProduct: 7, idProject: 71 },
    ]);
    expect(result.errors).toEqual([]);
  });

  it('rejects a selected project that does not belong to the matched product', async () => {
    productFindMany.mockResolvedValue([
      {
        id: 7,
        idStore: 'S-7',
        projects: [{ idProject: 70 }, { idProject: 71 }],
      },
    ]);
    const service = new ImportValidatorService(prisma);

    const result = await service.validateRows('store', [
      { ...row({ rowNumber: 3, externalProductId: 'S-7' }), idProject: 99 },
    ]);

    expect(result.stageRows).toMatchObject([
      { rowNumber: 3, idProduct: 7, idProject: null },
    ]);
    expect(result.errors).toEqual([
      {
        rowNumber: 3,
        field: 'idProject',
        message: 'Project 99 does not belong to matched product S-7',
      },
    ]);
  });

  it('creates an error for unmatched external IDs', async () => {
    productFindMany.mockResolvedValue([]);
    const service = new ImportValidatorService(prisma);

    const result = await service.validateRows('store', [
      row({ rowNumber: 3, externalProductId: 'S-999' }),
    ]);

    expect(result.stageRows).toMatchObject([
      { rowNumber: 3, idProduct: null, idProject: null },
    ]);
    expect(result.errors).toEqual([
      {
        rowNumber: 3,
        field: 'externalProductId',
        message: 'No product matched external ID S-999 for source store',
      },
    ]);
  });

  it('catches missing required row values and invalid quantity or amount', async () => {
    productFindMany.mockResolvedValue([]);
    const service = new ImportValidatorService(prisma);

    const result = await service.validateRows('surface', [
      row({
        rowNumber: 5,
        externalProductId: '',
        importedProductDescription: ' ',
        quantity: 0,
        amount: -1,
      }),
      row({
        rowNumber: 6,
        externalProductId: 'SUR-6',
        quantity: 1.5,
        amount: null,
      }),
    ]);

    expect(result.errors).toEqual([
      {
        rowNumber: 5,
        field: 'externalProductId',
        message: 'External product ID is required',
      },
      {
        rowNumber: 5,
        field: 'importedProductDescription',
        message: 'Imported product description is required',
      },
      {
        rowNumber: 5,
        field: 'quantity',
        message: 'Quantity must be an integer greater than 0',
      },
      {
        rowNumber: 5,
        field: 'amount',
        message: 'Amount must be a number greater than or equal to 0',
      },
      {
        rowNumber: 6,
        field: 'quantity',
        message: 'Quantity must be an integer greater than 0',
      },
      {
        rowNumber: 6,
        field: 'amount',
        message: 'Amount must be a number greater than or equal to 0',
      },
      {
        rowNumber: 6,
        field: 'externalProductId',
        message: 'No product matched external ID SUR-6 for source surface',
      },
    ]);
  });

  function row(overrides: Partial<ParsedImportRow> = {}): ParsedImportRow {
    return {
      rowNumber: 2,
      externalProductId: 'EC-7',
      importedProductDescription: 'Imported product',
      quantity: 2,
      amount: 30,
      rawRow: { id: 'EC-7', quantity: '2', amount: '30' },
      ...overrides,
    };
  }
});
