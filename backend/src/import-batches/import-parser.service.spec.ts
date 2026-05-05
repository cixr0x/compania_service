import { BadRequestException } from '@nestjs/common';
import { ImportParserService } from './import-parser.service';

describe('ImportParserService', () => {
  it('parses supported CSV header variants without coercing blank numeric values to zero', async () => {
    const service = new ImportParserService();
    const file = {
      originalname: 'sales.csv',
      buffer: Buffer.from(
        'ID,Description,Qty,Total\nS-1,Shirt,,25.50\nS-2,Hat,3,\n',
      ),
    } as Express.Multer.File;

    const rows = await service.parse(file);

    expect(rows).toEqual([
      {
        rowNumber: 2,
        externalProductId: 'S-1',
        importedProductDescription: 'Shirt',
        quantity: null,
        amount: 25.5,
        rawRow: {
          ID: 'S-1',
          Description: 'Shirt',
          Qty: '',
          Total: '25.50',
        },
      },
      {
        rowNumber: 3,
        externalProductId: 'S-2',
        importedProductDescription: 'Hat',
        quantity: 3,
        amount: null,
        rawRow: {
          ID: 'S-2',
          Description: 'Hat',
          Qty: '3',
          Total: '',
        },
      },
    ]);
  });

  it('rejects unsupported file extensions', async () => {
    const service = new ImportParserService();
    const file = {
      originalname: 'sales.xls',
      buffer: Buffer.from(''),
    } as Express.Multer.File;

    await expect(service.parse(file)).rejects.toThrow(
      new BadRequestException('Only CSV and XLSX files are supported'),
    );
  });
});
