import { Injectable } from '@nestjs/common';
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
  income: number;
  model: string;
  ownerProfit: number;
  productName: string;
  profit: number;
  projectId: number;
  totalAmount: number;
  totalCost: number;
  totalQuantity: number;
};

type SalesSummaryAccumulator = SalesSummaryRow & {
  ownerPercentage: number;
};

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
  project: true,
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

      const key = `${sale.product.id}:${sale.project.idProject}`;
      const row =
        rowsByProductProject.get(key) ??
        createEmptyRow({
          model: sale.product.model?.name ?? '',
          ownerPercentage: toNumber(sale.product.ownership),
          productName: sale.product.name,
          projectId: sale.project.idProject,
          totalCost:
            toNumber(sale.project.productionCost) +
            toNumber(sale.project.adminCost),
        });

      if (isReportSource(source)) {
        row[source].quantity += sale.quantity;
        row[source].amount += toNumber(sale.amount);
      }

      row.totalQuantity += sale.quantity;
      row.totalAmount += toNumber(sale.amount);
      row.fee += toNumber(sale.fee);
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
  ownerPercentage,
  productName,
  projectId,
  totalCost,
}: {
  model: string;
  ownerPercentage: number;
  productName: string;
  projectId: number;
  totalCost: number;
}): SalesSummaryAccumulator {
  return {
    ecommerce: createEmptySourceTotals(),
    event: createEmptySourceTotals(),
    fee: 0,
    income: 0,
    model,
    ownerPercentage,
    ownerProfit: 0,
    productName,
    profit: 0,
    projectId,
    store: createEmptySourceTotals(),
    surface: createEmptySourceTotals(),
    totalAmount: 0,
    totalCost: roundCurrency(totalCost),
    totalQuantity: 0,
  };
}

function recomputeFinancials(row: SalesSummaryAccumulator) {
  row.totalAmount = roundCurrency(row.totalAmount);
  row.fee = roundCurrency(row.fee);
  row.income = roundCurrency(row.totalAmount - row.totalCost);
  row.profit = roundCurrency(row.income - row.fee);
  row.ownerProfit = roundCurrency(row.profit * (row.ownerPercentage / 100));

  for (const source of ALL_REPORT_SOURCES) {
    row[source].amount = roundCurrency(row[source].amount);
  }
}

function stripAccumulator(row: SalesSummaryAccumulator): SalesSummaryRow {
  const { ownerPercentage: _ownerPercentage, ...publicRow } = row;
  return publicRow;
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

  if (value && typeof value === 'object' && 'toString' in value) {
    const numericValue = Number(value.toString());
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  return 0;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
