import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSaleDto } from './create-sale.dto';
import { UpdateSaleDto } from './update-sale.dto';

describe('Sale DTO validation', () => {
  it.each([
    'date',
    'idProduct',
    'quantity',
    'source',
    'amount',
    'fee',
  ] as const)('rejects explicit null for update %s', async (field) => {
    const dto = plainToInstance(UpdateSaleDto, { [field]: null });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain(field);
  });

  it.each(['amount', 'fee'] as const)(
    'rejects empty string for create %s',
    async (field) => {
      const dto = plainToInstance(CreateSaleDto, {
        date: '2026-05-05',
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

  it.each(['amount', 'fee'] as const)(
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
      idProduct: 7,
      quantity: 2,
      amount: 120,
      source: 'ecommerce',
      fee: null,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('fee');
  });

  it('rejects rollover calendar dates', async () => {
    const dto = plainToInstance(CreateSaleDto, {
      date: '2026-02-31',
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
      idProduct: 7,
      quantity: 2,
      amount: 120,
      source: '   ',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('source');
  });
});
