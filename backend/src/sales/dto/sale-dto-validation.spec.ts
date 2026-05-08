import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSaleDto } from './create-sale.dto';
import { UpdateSaleDto } from './update-sale.dto';

describe('Sale DTO validation', () => {
  it.each([
    'date',
    'idProject',
    'idProduct',
    'quantity',
    'source',
    'amount',
    'fee',
    'feeOverride',
    'profit',
    'ownerProfit',
  ] as const)('rejects explicit null for update %s', async (field) => {
    const dto = plainToInstance(UpdateSaleDto, { [field]: null });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain(field);
  });

  it.each(['amount', 'fee', 'profit', 'ownerProfit'] as const)(
    'rejects empty string for create %s',
    async (field) => {
      const dto = plainToInstance(CreateSaleDto, {
        date: '2026-05-05',
        idProject: 51,
        idProduct: 7,
        quantity: 2,
        amount: 120,
        source: 'ecommerce',
        [field]: '',
      });

      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toContain(field);
    },
  );

  it.each(['amount', 'fee', 'profit', 'ownerProfit'] as const)(
    'rejects empty string for update %s',
    async (field) => {
      const dto = plainToInstance(UpdateSaleDto, { [field]: '' });

      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toContain(field);
    },
  );

  it('rejects explicit null for create fee', async () => {
    const dto = plainToInstance(CreateSaleDto, {
      date: '2026-05-05',
      idProject: 51,
      idProduct: 7,
      quantity: 2,
      amount: 120,
      source: 'ecommerce',
      fee: null,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('fee');
  });

  it('accepts fee override as a boolean on create and update', async () => {
    const createDto = plainToInstance(CreateSaleDto, {
      date: '2026-05-05',
      feeOverride: true,
      idProject: 51,
      idProduct: 7,
      quantity: 2,
      amount: 120,
      source: 'ecommerce',
    });
    const updateDto = plainToInstance(UpdateSaleDto, {
      feeOverride: false,
    });

    await expect(validate(createDto)).resolves.toHaveLength(0);
    await expect(validate(updateDto)).resolves.toHaveLength(0);
  });

  it('rejects non-boolean fee override values', async () => {
    const dto = plainToInstance(CreateSaleDto, {
      date: '2026-05-05',
      feeOverride: 'false',
      idProject: 51,
      idProduct: 7,
      quantity: 2,
      amount: 120,
      source: 'ecommerce',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('feeOverride');
  });

  it('requires a project when creating a sale', async () => {
    const dto = plainToInstance(CreateSaleDto, {
      date: '2026-05-05',
      idProduct: 7,
      quantity: 2,
      amount: 120,
      source: 'ecommerce',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('idProject');
  });

  it('rejects rollover calendar dates', async () => {
    const dto = plainToInstance(CreateSaleDto, {
      date: '2026-02-31',
      idProject: 51,
      idProduct: 7,
      quantity: 2,
      amount: 120,
      source: 'ecommerce',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('date');
  });

  it('rejects source that becomes blank after trim', async () => {
    const dto = plainToInstance(CreateSaleDto, {
      date: '2026-05-05',
      idProject: 51,
      idProduct: 7,
      quantity: 2,
      amount: 120,
      source: '   ',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('source');
  });
});
