import { BadRequestException } from '@nestjs/common';
import { SaleFeeCalculatorService } from './sale-fee-calculator.service';

describe('SaleFeeCalculatorService', () => {
  const prisma = {
    project: {
      findUnique: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it.each([
    ['percentage', 25, 100, 2, 25],
    ['percentage', 10, 100, 2, 10],
    ['fixed', 7.5, 100, 2, 15],
  ])(
    'calculates sale fee for %s project fee model',
    async (feeModel, feeValue, amount, quantity, expectedFee) => {
      jest.spyOn(prisma.project, 'findUnique').mockResolvedValue({
        feeModel,
        feeValue,
        idProject: 51,
      });

      const calculator = new SaleFeeCalculatorService(prisma);

      await expect(
        calculator.calculateFee({
          amount,
          idProject: 51,
          quantity,
        }),
      ).resolves.toBe(expectedFee);
    },
  );

  it('selects project fee fields only', async () => {
    jest.spyOn(prisma.project, 'findUnique').mockResolvedValue({
      feeModel: 'percentage',
      feeValue: 18,
      idProject: 51,
    });

    const calculator = new SaleFeeCalculatorService(prisma);

    await expect(
      calculator.calculateFee({
        amount: 100,
        idProject: 51,
        quantity: 2,
      }),
    ).resolves.toBe(18);
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { idProject: 51 },
      select: { feeModel: true, feeValue: true, idProject: true },
    });
  });

  it('rejects unsupported project fee models', async () => {
    jest.spyOn(prisma.project, 'findUnique').mockResolvedValue({
      feeModel: 'legacy_model',
      feeValue: 18,
      idProject: 51,
    });

    const calculator = new SaleFeeCalculatorService(prisma);

    await expect(
      calculator.calculateFee({
        amount: 100,
        idProject: 51,
        quantity: 2,
      }),
    ).rejects.toThrow(
      new BadRequestException('Unsupported project fee model legacy_model'),
    );
  });
});
