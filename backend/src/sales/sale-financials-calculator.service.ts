import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type FinancialCalculationInput = {
  amount: unknown;
  fee: unknown;
  idProduct: number;
  tax: unknown;
};

type FinancialCalculationClient = Pick<PrismaService, 'product'>;

@Injectable()
export class SaleFinancialsCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateFinancials(
    input: FinancialCalculationInput,
    client: FinancialCalculationClient = this.prisma,
  ) {
    const product = await client.product.findUnique({
      where: { id: input.idProduct },
      select: { id: true, ownership: true },
    });

    if (!product) {
      throw new BadRequestException(`Product ${input.idProduct} was not found`);
    }

    const amount = toFiniteNumber(input.amount) ?? 0;
    const fee = toFiniteNumber(input.fee) ?? 0;
    const tax = toFiniteNumber(input.tax) ?? 0;
    const ownerPercentage = toFiniteNumber(product.ownership) ?? 0;
    const profit = roundCurrency(amount - fee - tax);

    return {
      ownerProfit: roundCurrency(profit * (ownerPercentage / 100)),
      profit,
    };
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
