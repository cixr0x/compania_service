import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type FeeCalculationInput = {
  amount: unknown;
  idProduct: number;
  idProject: number;
  quantity: unknown;
};

type FeeCalculationClient = Pick<PrismaService, 'product' | 'project'>;

@Injectable()
export class SaleFeeCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateFee(
    input: FeeCalculationInput,
    client: FeeCalculationClient = this.prisma,
  ) {
    const product = await client.product.findUnique({
      where: { id: input.idProduct },
      select: {
        id: true,
        feeAmount: true,
      },
    });
    const project = await client.project.findUnique({
      where: { idProject: input.idProject },
      select: {
        idProject: true,
        model: { select: { code: true } },
      },
    });

    if (!product) {
      throw new BadRequestException(`Product ${input.idProduct} was not found`);
    }

    if (!project) {
      throw new BadRequestException(`Project ${input.idProject} was not found`);
    }

    const modelCode = project.model?.code?.trim().toLowerCase();
    if (!modelCode) {
      throw new BadRequestException(
        `Project ${input.idProject} does not have a pricing model code`,
      );
    }

    const amount = toFiniteNumber(input.amount) ?? 0;
    const quantity = toFiniteNumber(input.quantity) ?? 0;

    if (modelCode === 'consigna256') {
      return roundCurrency(amount * 0.25);
    }

    if (modelCode === 'interno') {
      return roundCurrency(amount * 0.1);
    }

    if (modelCode === 'consigna') {
      const feeAmount = toFiniteNumber(product.feeAmount);
      if (feeAmount === null) {
        throw new BadRequestException(
          `Product ${input.idProduct} requires a fee amount for consigna`,
        );
      }

      return roundCurrency(quantity * feeAmount);
    }

    if (modelCode === 'ladrillo') {
      return roundCurrency(amount * 0.18);
    }

    throw new BadRequestException(
      `Unsupported pricing model code ${modelCode}`,
    );
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
