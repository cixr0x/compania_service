import { BadRequestException } from '@nestjs/common';
import { asPrismaService } from '../../test/prisma-service.mock';
import { SaleFinancialsCalculatorService } from './sale-financials-calculator.service';

describe('SaleFinancialsCalculatorService', () => {
  type ProductOwnership = {
    id: number;
    ownership: string;
  };

  const findProduct =
    jest.fn<(args: unknown) => Promise<ProductOwnership | null>>();
  const prisma = {
    product: {
      findUnique: findProduct,
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calculates persisted profit and owner profit from sale values and product ownership', async () => {
    findProduct.mockResolvedValue({
      id: 7,
      ownership: '25.00',
    });

    const calculator = new SaleFinancialsCalculatorService(
      asPrismaService(prisma),
    );

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
    expect(findProduct).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { id: true, ownership: true },
    });
  });

  it('rejects profit calculation for a missing product', async () => {
    findProduct.mockResolvedValue(null);

    const calculator = new SaleFinancialsCalculatorService(
      asPrismaService(prisma),
    );

    await expect(
      calculator.calculateFinancials({
        amount: 120,
        fee: 9.5,
        idProduct: 999,
      }),
    ).rejects.toThrow(new BadRequestException('Product 999 was not found'));
  });
});
