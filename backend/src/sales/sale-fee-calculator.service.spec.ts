import { BadRequestException } from '@nestjs/common';
import { asPrismaService } from '../../test/prisma-service.mock';
import { SaleFeeCalculatorService } from './sale-fee-calculator.service';

describe('SaleFeeCalculatorService', () => {
  type ProjectFee = {
    feeModel: string;
    feeValue: number;
    idProject: number;
  };

  const findProject = jest.fn<(args: unknown) => Promise<ProjectFee | null>>();
  const prisma = {
    project: {
      findUnique: findProject,
    },
  };

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
      findProject.mockResolvedValue({
        feeModel,
        feeValue,
        idProject: 51,
      });

      const calculator = new SaleFeeCalculatorService(asPrismaService(prisma));

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
    findProject.mockResolvedValue({
      feeModel: 'percentage',
      feeValue: 18,
      idProject: 51,
    });

    const calculator = new SaleFeeCalculatorService(asPrismaService(prisma));

    await expect(
      calculator.calculateFee({
        amount: 100,
        idProject: 51,
        quantity: 2,
      }),
    ).resolves.toBe(18);
    expect(findProject).toHaveBeenCalledWith({
      where: { idProject: 51 },
      select: { feeModel: true, feeValue: true, idProject: true },
    });
  });

  it('rejects unsupported project fee models', async () => {
    findProject.mockResolvedValue({
      feeModel: 'legacy_model',
      feeValue: 18,
      idProject: 51,
    });

    const calculator = new SaleFeeCalculatorService(asPrismaService(prisma));

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
