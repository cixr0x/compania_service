import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { parseSaleDate } from './dto/sale-date-string.validator';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SaleFeeCalculatorService } from './sale-fee-calculator.service';
import { SaleFinancialsCalculatorService } from './sale-financials-calculator.service';

const saleInclude = {
  product: true,
  project: { include: { product: true } },
};
const SALES_TAX_SETTING_CODE = 'sales_tax';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feeCalculator: SaleFeeCalculatorService,
    private readonly financialsCalculator: SaleFinancialsCalculatorService,
  ) {}

  async create(dto: CreateSaleDto) {
    await this.ensureProductExists(dto.idProduct);
    await this.ensureProjectBelongsToProduct(dto.idProject, dto.idProduct);
    return this.prisma.sale.create({
      data: await this.normalizeSaleCreateData(dto),
    });
  }

  findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    return this.prisma.sale.findMany({
      include: saleInclude,
      orderBy: { idSale: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.sale.findUnique({
      where: { idSale: id },
      include: saleInclude,
    });
    if (!record) throw new NotFoundException(`Sale ${id} was not found`);
    return record;
  }

  async update(id: number, dto: UpdateSaleDto) {
    const current = await this.findOne(id);
    if (dto.idProduct !== undefined) {
      await this.ensureProductExists(dto.idProduct);
    }
    if (dto.idProject !== undefined || dto.idProduct !== undefined) {
      await this.ensureProjectBelongsToProduct(
        dto.idProject ?? current.idProject,
        dto.idProduct ?? current.idProduct,
      );
    }
    return this.prisma.sale.update({
      where: { idSale: id },
      data: await this.normalizeSaleUpdateData(dto, current),
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.sale.delete({ where: { idSale: id } });
  }

  private async normalizeSaleCreateData(
    dto: CreateSaleDto,
  ): Promise<Prisma.SaleUncheckedCreateInput> {
    const feeOverride = dto.feeOverride === true;
    const fee = feeOverride
      ? (dto.fee ?? 0)
      : await this.feeCalculator.calculateFee({
          amount: dto.amount,
          idProduct: dto.idProduct,
          idProject: dto.idProject,
          quantity: dto.quantity,
        });
    const taxDetails = await this.calculateTaxDetails(dto.amount);
    const financials = await this.financialsCalculator.calculateFinancials({
      amount: dto.amount,
      fee,
      idProduct: dto.idProduct,
      tax: taxDetails.tax,
    });

    return {
      ...this.normalizeSaleWriteData(dto),
      fee,
      feeOverride,
      ...taxDetails,
      ...financials,
    } as Prisma.SaleUncheckedCreateInput;
  }

  private async normalizeSaleUpdateData(
    dto: UpdateSaleDto,
    current: {
      amount: unknown;
      feeOverride?: boolean | null;
      fee: unknown;
      idProduct: number;
      idProject: number;
      quantity: number;
      tax: unknown;
    },
  ): Promise<Prisma.SaleUncheckedUpdateInput> {
    const data = this.normalizeSaleWriteData(dto);
    const nextFeeOverride = dto.feeOverride ?? current.feeOverride === true;

    if (
      !nextFeeOverride &&
      (dto.amount !== undefined ||
        dto.fee !== undefined ||
        dto.feeOverride === false ||
        dto.idProduct !== undefined ||
        dto.idProject !== undefined ||
        dto.quantity !== undefined)
    ) {
      data.fee = await this.feeCalculator.calculateFee({
        amount: dto.amount ?? current.amount,
        idProduct: dto.idProduct ?? current.idProduct,
        idProject: dto.idProject ?? current.idProject,
        quantity: dto.quantity ?? current.quantity,
      });
    }

    let nextTax = data.tax ?? current.tax;
    if (
      dto.amount !== undefined ||
      dto.fee !== undefined ||
      dto.tax !== undefined
    ) {
      const taxDetails = await this.calculateTaxDetails(
        data.amount ?? current.amount,
      );
      Object.assign(data, taxDetails);
      nextTax = taxDetails.tax;
    }

    if (this.shouldCalculateFinancials(dto, data)) {
      Object.assign(
        data,
        await this.financialsCalculator.calculateFinancials({
          amount: data.amount ?? current.amount,
          fee: data.fee ?? current.fee,
          idProduct: dto.idProduct ?? current.idProduct,
          tax: nextTax,
        }),
      );
    }

    return data;
  }

  private normalizeSaleWriteData(dto: CreateSaleDto | UpdateSaleDto) {
    const data: Record<string, unknown> = { ...dto };

    if (typeof data.date === 'string') {
      const parsedDate = parseSaleDate(data.date);
      if (!parsedDate) {
        throw new BadRequestException(
          'Date must be a valid calendar date in YYYY-MM-DD format',
        );
      }
      data.date = parsedDate;
    }

    if (typeof data.source === 'string') {
      data.source = data.source.trim();
      if (data.source === '') {
        throw new BadRequestException('Source cannot be blank');
      }
    }

    return data;
  }

  private async getSalesTaxRate() {
    const setting = await this.prisma.setting.findUnique({
      where: { code: SALES_TAX_SETTING_CODE },
      select: { value: true },
    });
    const taxRate = toFiniteNumber(setting?.value);

    if (taxRate === null || taxRate < 0) {
      throw new BadRequestException(
        'Setting sales_tax must be configured as a decimal tax rate',
      );
    }

    return taxRate;
  }

  private async calculateTaxDetails(amount: unknown) {
    const numericAmount = toFiniteNumber(amount);
    const taxRate = await this.getSalesTaxRate();

    return {
      tax: roundCurrency((numericAmount ?? 0) * taxRate),
      taxPct: taxRate,
    };
  }

  private shouldCalculateFinancials(
    dto: UpdateSaleDto,
    data: Record<string, unknown>,
  ) {
    return (
      data.amount !== undefined ||
      data.fee !== undefined ||
      data.tax !== undefined ||
      data.profit !== undefined ||
      data.ownerProfit !== undefined ||
      dto.feeOverride !== undefined ||
      dto.idProduct !== undefined ||
      dto.quantity !== undefined
    );
  }

  private async ensureProductExists(idProduct: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: idProduct },
      select: { id: true },
    });
    if (!product) {
      throw new BadRequestException(`Product ${idProduct} was not found`);
    }
  }

  private async ensureProjectBelongsToProduct(
    idProject: number,
    idProduct: number,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { idProject },
      select: { idProject: true, idProduct: true },
    });

    if (!project) {
      throw new BadRequestException(`Project ${idProject} was not found`);
    }

    if (project.idProduct !== idProduct) {
      throw new BadRequestException(
        `Project ${idProject} does not belong to product ${idProduct}`,
      );
    }
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
