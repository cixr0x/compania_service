import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { publicProjectSummarySelect } from '../projects/project-public-select';
import { CreateSaleDto } from './dto/create-sale.dto';
import { parseSaleDate } from './dto/sale-date-string.validator';
import { SalesQueryDto } from './dto/sales-query.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SaleFeeCalculatorService } from './sale-fee-calculator.service';
import { SaleFinancialsCalculatorService } from './sale-financials-calculator.service';

const saleInclude = {
  product: true,
  project: { select: publicProjectSummarySelect },
};

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

  findAll(query: SalesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where = this.buildSalesWhere(query);
    const args: Prisma.SaleFindManyArgs = {
      include: saleInclude,
      orderBy: { idSale: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    };

    if (Object.keys(where).length > 0) {
      args.where = where;
    }

    return this.prisma.sale.findMany(args);
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
          idProject: dto.idProject,
          quantity: dto.quantity,
        });
    const financials = await this.financialsCalculator.calculateFinancials({
      amount: dto.amount,
      fee,
      idProduct: dto.idProduct,
    });

    return {
      ...this.normalizeSaleWriteData(dto),
      fee,
      feeOverride,
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
        idProject: dto.idProject ?? current.idProject,
        quantity: dto.quantity ?? current.quantity,
      });
    }

    if (this.shouldCalculateFinancials(dto, data)) {
      Object.assign(
        data,
        await this.financialsCalculator.calculateFinancials({
          amount: data.amount ?? current.amount,
          fee: data.fee ?? current.fee,
          idProduct: dto.idProduct ?? current.idProduct,
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

  private shouldCalculateFinancials(
    dto: UpdateSaleDto,
    data: Record<string, unknown>,
  ) {
    return (
      data.amount !== undefined ||
      data.fee !== undefined ||
      data.profit !== undefined ||
      data.ownerProfit !== undefined ||
      dto.feeOverride !== undefined ||
      dto.idProduct !== undefined ||
      dto.quantity !== undefined
    );
  }

  private buildSalesWhere(query: SalesQueryDto): Prisma.SaleWhereInput {
    const where: Prisma.SaleWhereInput = {};

    if (query.idProduct !== undefined) {
      where.idProduct = query.idProduct;
    }

    if (query.idProject !== undefined) {
      where.idProject = query.idProject;
    }

    if (query.month) {
      const { end, start } = this.getMonthDateRange(query.month);
      where.date = {
        gte: start,
        lt: end,
      };
    }

    return where;
  }

  private getMonthDateRange(month: string) {
    const match = month.match(/^(\d{4})-(0[1-9]|1[0-2])$/);

    if (!match) {
      throw new BadRequestException('Month must be in YYYY-MM format');
    }

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const start = new Date(Date.UTC(year, monthIndex, 1));
    const end = new Date(Date.UTC(year, monthIndex + 1, 1));

    return { end, start };
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
