import {
  ImportValidatorService,
  ParsedImportRow,
} from './import-validator.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ImportValidatorService', () => {
  const prisma = {
    product: {
      findMany: jest.fn(),
    },
  } as any;

  beforeEach(() => jest.resetAllMocks());

  it('matches ecommerce external IDs to product.idEcommerce', async () => {
    jest
      .spyOn(prisma.product, 'findMany')
      .mockResolvedValue([{ id: 7, idEcommerce: 'EC-7' }]);
    const service = new ImportValidatorService(prisma as PrismaService);

    const result = await service.validateRows('ecommerce', [
      row({ externalProductId: 'EC-7' }),
    ]);

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { idEcommerce: { in: ['EC-7'] } },
      select: { id: true, idEcommerce: true },
    });
    expect(result.stageRows).toMatchObject([{ idProduct: 7 }]);
    expect(result.errors).toEqual([]);
  });

  it('creates an error for unmatched external IDs', async () => {
    jest.spyOn(prisma.product, 'findMany').mockResolvedValue([]);
    const service = new ImportValidatorService(prisma as PrismaService);

    const result = await service.validateRows('store', [
      row({ rowNumber: 3, externalProductId: 'S-999' }),
    ]);

    expect(result.stageRows).toMatchObject([{ rowNumber: 3, idProduct: null }]);
    expect(result.errors).toEqual([
      {
        rowNumber: 3,
        field: 'externalProductId',
        message: 'No product matched external ID S-999 for source store',
      },
    ]);
  });

  it('catches missing required row values and invalid quantity or amount', async () => {
    jest.spyOn(prisma.product, 'findMany').mockResolvedValue([]);
    const service = new ImportValidatorService(prisma as PrismaService);

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
