import { SalesService } from './sales.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SalesService', () => {
  const prisma = {
    sale: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
  } as any;

  beforeEach(() => jest.resetAllMocks());

  it('creates a sale with a default fee of zero when fee is omitted', async () => {
    jest.spyOn(prisma.sale, 'create').mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '0.00',
    });
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({ id: 7 });

    const service = new SalesService(prisma as PrismaService);
    await service.create({
      date: '2026-05-05',
      idProduct: 7,
      quantity: 2,
      amount: 120,
      source: 'ecommerce',
    });

    expect(prisma.sale.create).toHaveBeenCalledWith({
      data: {
        date: new Date('2026-05-05'),
        idProduct: 7,
        quantity: 2,
        amount: 120,
        source: 'ecommerce',
        fee: 0,
      },
    });
  });

  it('creates a sale with a Date instance when date is a string', async () => {
    jest.spyOn(prisma.sale, 'create').mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
    });
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({ id: 7 });

    const service = new SalesService(prisma as PrismaService);
    await service.create({
      date: '2026-05-05',
      idProduct: 7,
      quantity: 2,
      amount: 120,
      source: 'ecommerce',
      fee: 1.5,
    });

    const call = prisma.sale.create.mock.calls[0][0];
    expect(call.data.date).toBeInstanceOf(Date);
    expect(call.data.date).toEqual(new Date('2026-05-05'));
  });

  it('does not include fee in update data when fee is omitted', async () => {
    jest.spyOn(prisma.sale, 'findUnique').mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
    });
    jest.spyOn(prisma.sale, 'update').mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      quantity: 3,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
    });

    const service = new SalesService(prisma as PrismaService);
    await service.update(1, { quantity: 3 });

    expect(prisma.sale.update).toHaveBeenCalledWith({
      where: { idSale: 1 },
      data: { quantity: 3 },
    });
  });

  it('does not include date in update data when date is omitted', async () => {
    jest.spyOn(prisma.sale, 'findUnique').mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
    });
    jest.spyOn(prisma.sale, 'update').mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      quantity: 2,
      amount: '130.00',
      source: 'ecommerce',
      fee: '1.50',
    });

    const service = new SalesService(prisma as PrismaService);
    await service.update(1, { amount: 130 });

    expect(prisma.sale.update).toHaveBeenCalledWith({
      where: { idSale: 1 },
      data: { amount: 130 },
    });
  });

  it('throws a client error when create references a missing product', async () => {
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(null);

    const service = new SalesService(prisma as PrismaService);

    await expect(
      service.create({
        date: '2026-05-05',
        idProduct: 999,
        quantity: 2,
        amount: 120,
        source: 'ecommerce',
      }),
    ).rejects.toThrow('Product 999 was not found');
    expect(prisma.sale.create).not.toHaveBeenCalled();
  });

  it('throws a client error when update references a missing product', async () => {
    jest.spyOn(prisma.sale, 'findUnique').mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '1.50',
    });
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(null);

    const service = new SalesService(prisma as PrismaService);

    await expect(service.update(1, { idProduct: 999 })).rejects.toThrow(
      'Product 999 was not found',
    );
    expect(prisma.sale.update).not.toHaveBeenCalled();
  });
});
