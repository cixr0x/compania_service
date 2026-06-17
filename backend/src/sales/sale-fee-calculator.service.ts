import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type FeeCalculationInput = {
  amount: unknown;
  idProject: number;
  quantity: unknown;
};

type FeeCalculationClient = Pick<PrismaService, 'project'>;

@Injectable()
export class SaleFeeCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateFee(
    input: FeeCalculationInput,
    client: FeeCalculationClient = this.prisma,
  ) {
    const project = await client.project.findUnique({
      where: { idProject: input.idProject },
      select: {
        feeType: true,
        feeValue: true,
        idProject: true,
      },
    });

    if (!project) {
      throw new BadRequestException(`Project ${input.idProject} was not found`);
    }

    const feeType = project.feeType?.trim().toLowerCase();
    const feeValue = toFiniteNumber(project.feeValue);

    if (!feeType) {
      throw new BadRequestException(
        `Project ${input.idProject} does not have a fee type`,
      );
    }

    if (feeValue === null) {
      throw new BadRequestException(
        `Project ${input.idProject} does not have a valid fee value`,
      );
    }

    const amount = toFiniteNumber(input.amount) ?? 0;
    const quantity = toFiniteNumber(input.quantity) ?? 0;

    if (feeType === 'sale_percentage') {
      return roundCurrency(amount * (feeValue / 100));
    }

    if (feeType === 'fixed_per_unit') {
      return roundCurrency(quantity * feeValue);
    }

    throw new BadRequestException(`Unsupported project fee type ${feeType}`);
  }
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  return null;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
