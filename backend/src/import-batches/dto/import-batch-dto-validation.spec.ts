import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateImportBatchDto } from './create-import-batch.dto';
import { UpdateImportBatchDto } from './update-import-batch.dto';

describe('Import batch DTO validation', () => {
  it('requires source to be one of the import sources', async () => {
    const dto = plainToInstance(CreateImportBatchDto, {
      source: 'marketplace',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('source');
  });

  it.each(['source', 'importDate'] as const)(
    'rejects explicit null for update %s',
    async (field) => {
      const dto = plainToInstance(UpdateImportBatchDto, { [field]: null });

      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toContain(field);
    },
  );

  it('rejects rollover import dates', async () => {
    const dto = plainToInstance(UpdateImportBatchDto, {
      importDate: '2026-02-31',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('importDate');
  });
});
