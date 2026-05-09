import { BadRequestException } from '@nestjs/common';
import { SaleFinancialsCalculatorService } from './sale-financials-calculator.service';

describe('SaleFinancialsCalculatorService', () => {
  const prisma = {
    product: {
      findUnique: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calculates persisted profit and owner profit from sale values and product ownership', async () => {
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({
      id: 7,
      ownership: '25.00',
    });

    const calculator = new SaleFinancialsCalculatorService(prisma);

    await expect(
      calculator.calculateFinancials({
        amount: 120,
        fee: 9.5,
        idProduct: 7,
      }),
    ).resolves.toEqual({
      ownerProfit: 27.63,
      profit: 110.5,
    });
    expect(prisma.product.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { id: true, ownership: true },
    });
  });

  it('rejects profit calculation for a missing product', async () => {
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(null);

    const calculator = new SaleFinancialsCalculatorService(prisma);

    await expect(
      calculator.calculateFinancials({
        amount: 120,
        fee: 9.5,
        idProduct: 999,
      }),
    ).rejects.toThrow(new BadRequestException('Product 999 was not found'));
  });
});
