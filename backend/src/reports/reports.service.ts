import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ImportSource } from '../common/constants/import-sources';
import { PrismaService } from '../prisma/prisma.service';
import { SalesSummaryQueryDto } from './dto/sales-summary-query.dto';

const BASE_REPORT_SOURCES = ['store', 'ecommerce', 'event'] as const;
const ALL_REPORT_SOURCES = [...BASE_REPORT_SOURCES, 'surface'] as const;

type ReportSource = (typeof ALL_REPORT_SOURCES)[number];

type SourceTotals = {
  amount: number;
  quantity: number;
};

type SalesSummaryRow = Record<ReportSource, SourceTotals> & {
  fee: number;
  model: string;
  ownerProfit: number;
  productImage: string | null;
  productName: string;
  profit: number;
  projectId: number;
  totalAmount: number;
  totalQuantity: number;
};

type SalesSummaryAccumulator = SalesSummaryRow & {};

type SalesSummaryResponse = {
  rows: SalesSummaryRow[];
  sources: ReportSource[];
};

type SalesSummaryPeriod = {
  months: number[];
  year: number;
};

const salesReportInclude = {
  product: { include: { model: true } },
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findSalesSummaryPeriods(): Promise<SalesSummaryPeriod[]> {
    const rows = await this.prisma.sale.findMany({
      orderBy: { date: 'desc' },
      select: { date: true },
    });
    const monthsByYear = new Map<number, Set<number>>();

    for (const row of rows) {
      const year = row.date.getUTCFullYear();
      const month = row.date.getUTCMonth() + 1;
      const months = monthsByYear.get(year) ?? new Set<number>();
      months.add(month);
      monthsByYear.set(year, months);
    }

    return [...monthsByYear.entries()]
      .sort(([leftYear], [rightYear]) => rightYear - leftYear)
      .map(([year, months]) => ({
        year,
        months: [...months].sort((left, right) => right - left),
      }));
  }

  async getSalesSummary(
    query: SalesSummaryQueryDto,
  ): Promise<SalesSummaryResponse> {
    const { gte, lt } = getDateRange(query);
    const sales = await this.prisma.sale.findMany({
      include: salesReportInclude,
      orderBy: [{ product: { name: 'asc' } }, { idProject: 'asc' }],
      where: {
        date: { gte, lt },
      },
    });
    const rowsByProductProject = new Map<string, SalesSummaryAccumulator>();
    let hasSurfaceSales = false;

    for (const sale of sales) {
      const source = sale.source as ImportSource;
      if (source === 'surface') {
        hasSurfaceSales = true;
      }

      const key = `${sale.product.id}:${sale.idProject}`;
      const row =
        rowsByProductProject.get(key) ??
        createEmptyRow({
          model: sale.product.model?.name ?? '',
          productImage: normalizeImageUrl(sale.product.image),
          productName: sale.product.name,
          projectId: sale.idProject,
        });

      if (isReportSource(source)) {
        row[source].quantity += sale.quantity;
        row[source].amount += toNumber(sale.amount);
      }

      row.totalQuantity += sale.quantity;
      row.totalAmount += toNumber(sale.amount);
      row.fee += toNumber(sale.fee);
      row.profit += toNumber(sale.profit);
      row.ownerProfit += toNumber(sale.ownerProfit);
      recomputeFinancials(row);
      rowsByProductProject.set(key, row);
    }

    const rows = [...rowsByProductProject.values()].map(stripAccumulator);
    const sources: ReportSource[] = hasSurfaceSales
      ? [...ALL_REPORT_SOURCES]
      : [...BASE_REPORT_SOURCES];

    return { rows, sources };
  }
}

function getDateRange(query: SalesSummaryQueryDto) {
  const startMonth = query.month ? query.month - 1 : 0;
  const endYear = query.month === undefined ? query.year + 1 : query.year;
  const endMonth = query.month === undefined ? 0 : query.month;

  return {
    gte: new Date(Date.UTC(query.year, startMonth, 1)),
    lt: new Date(Date.UTC(endYear, endMonth, 1)),
  };
}

function createEmptySourceTotals(): SourceTotals {
  return { amount: 0, quantity: 0 };
}

function createEmptyRow({
  model,
  productImage,
  productName,
  projectId,
}: {
  model: string;
  productImage: string | null;
  productName: string;
  projectId: number;
}): SalesSummaryAccumulator {
  return {
    ecommerce: createEmptySourceTotals(),
    event: createEmptySourceTotals(),
    fee: 0,
    model,
    ownerProfit: 0,
    productImage,
    productName,
    profit: 0,
    projectId,
    store: createEmptySourceTotals(),
    surface: createEmptySourceTotals(),
    totalAmount: 0,
    totalQuantity: 0,
  };
}

function recomputeFinancials(row: SalesSummaryAccumulator) {
  row.totalAmount = roundCurrency(row.totalAmount);
  row.fee = roundCurrency(row.fee);
  row.profit = roundCurrency(row.profit);
  row.ownerProfit = roundCurrency(row.ownerProfit);

  for (const source of ALL_REPORT_SOURCES) {
    row[source].amount = roundCurrency(row[source].amount);
  }
}

function stripAccumulator(row: SalesSummaryAccumulator): SalesSummaryRow {
  return row;
}

function isReportSource(source: string): source is ReportSource {
  return ALL_REPORT_SOURCES.includes(source as ReportSource);
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  return 0;
}

function normalizeImageUrl(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
