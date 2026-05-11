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
        model: { code },
      });
      jest.spyOn(prisma.project, 'findUnique').mockResolvedValue({
        idProject: 51,
        transactions: [
          { amount: '100.00' },
          { amount: '20.00' },
          { amount: '5.00' },
        ],
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

  it('calculates ladrillo fee from sale amount plus project total cost', async () => {
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({
      id: 7,
      feeAmount: null,
      model: { code: 'ladrillo' },
    });
    jest.spyOn(prisma.project, 'findUnique').mockResolvedValue({
      idProject: 51,
      transactions: [
        { amount: '100.00' },
        { amount: '20.00' },
        { amount: '-10.00' },
      ],
    });

    const calculator = new SaleFeeCalculatorService(prisma);

    await expect(
      calculator.calculateFee({
        amount: 100,
        idProduct: 7,
        idProject: 51,
        quantity: 2,
      }),
    ).resolves.toBe(17.75);
  });

  it('rejects consigna fee calculation when product fee amount is missing', async () => {
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({
      id: 7,
      feeAmount: null,
      model: { code: 'consigna' },
    });
    jest.spyOn(prisma.project, 'findUnique').mockResolvedValue({
      idProject: 51,
      transactions: [
        { amount: '100.00' },
        { amount: '20.00' },
      ],
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
