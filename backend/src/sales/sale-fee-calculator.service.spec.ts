import { BadRequestException } from '@nestjs/common';
import { SaleFeeCalculatorService } from './sale-fee-calculator.service';

describe('SaleFeeCalculatorService', () => {
  const prisma = {
    product: {
      findUnique: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it.each([
    ['consigna256', 100, 2, null, 25],
    ['interno', 100, 2, null, 10],
    ['consigna', 100, 2, 7.5, 15],
  ])(
    'calculates sale fee for %s model',
    async (code, amount, quantity, feeAmount, expectedFee) => {
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({
        id: 7,
        feeAmount,
      });
      jest.spyOn(prisma.project, 'findUnique').mockResolvedValue({
        idProject: 51,
        model: { code },
      });

      const calculator = new SaleFeeCalculatorService(prisma);

      await expect(
        calculator.calculateFee({
          amount,
          idProduct: 7,
          idProject: 51,
          quantity,
        }),
      ).resolves.toBe(expectedFee);
    },
  );

  it('calculates ladrillo fee as 18 percent of the sale amount', async () => {
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({
      id: 7,
      feeAmount: null,
    });
    jest.spyOn(prisma.project, 'findUnique').mockResolvedValue({
      idProject: 51,
      model: { code: 'ladrillo' },
    });

    const calculator = new SaleFeeCalculatorService(prisma);

    await expect(
      calculator.calculateFee({
        amount: 100,
        idProduct: 7,
        idProject: 51,
        quantity: 2,
      }),
    ).resolves.toBe(18);
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { idProject: 51 },
      select: { idProject: true, model: { select: { code: true } } },
    });
  });

  it('rejects consigna fee calculation when product fee amount is missing', async () => {
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({
      id: 7,
      feeAmount: null,
    });
    jest.spyOn(prisma.project, 'findUnique').mockResolvedValue({
      idProject: 51,
      model: { code: 'consigna' },
    });

    const calculator = new SaleFeeCalculatorService(prisma);

    await expect(
      calculator.calculateFee({
        amount: 100,
        idProduct: 7,
        idProject: 51,
        quantity: 2,
      }),
    ).rejects.toThrow(
      new BadRequestException('Product 7 requires a fee amount for consigna'),
    );
  });
});
