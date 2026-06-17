import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ImportStatus, Prisma } from '@prisma/client';
import { CreateImportBatchDto } from './dto/create-import-batch.dto';
import { UpdateImportBatchDto } from './dto/update-import-batch.dto';
import { ImportParserService } from './import-parser.service';
import {
  ImportRowError,
  ImportStageRowData,
  ImportValidatorService,
  ParsedImportRow,
} from './import-validator.service';
import { parseSaleDate } from '../sales/dto/sale-date-string.validator';
import { PrismaService } from '../prisma/prisma.service';
import { SaleFeeCalculatorService } from '../sales/sale-fee-calculator.service';
import { SaleFinancialsCalculatorService } from '../sales/sale-financials-calculator.service';

const batchDetailInclude = {
  _count: { select: { stageRows: true, errors: true } },
};
const importStageInclude = {
  product: {
    include: {
      projects: {
        orderBy: { idProject: 'asc' as const },
      },
    },
  },
  project: { include: { product: true } },
};

const mutableTerminalStatuses: ImportStatus[] = ['committed', 'cancelled'];
type TransactionClient = Prisma.TransactionClient;
type StageForParse = {
  rowNumber: number;
  externalProductId: string | null;
  importedProductDescription: string | null;
  idProject?: number | null;
  quantity: number | null;
  amount: Prisma.Decimal | number | string | null;
  rawRow: Prisma.JsonValue | null;
};
type StageForValidationUpdate = StageForParse & {
  idImportStage: number;
};

@Injectable()
export class ImportBatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: ImportParserService,
    private readonly validator: ImportValidatorService,
    private readonly feeCalculator: SaleFeeCalculatorService,
    private readonly financialsCalculator: SaleFinancialsCalculatorService,
  ) {}

  async create(dto: CreateImportBatchDto, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const rows = await this.parser.parse(file);
    const validation = await this.validator.validateRows(dto.source, rows);
    const status = validation.errors.length > 0 ? 'has_errors' : 'validated';

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.importBatch.create({
        data: {
          source: dto.source,
          originalFilename: file.originalname,
          status,
        },
      });

      if (validation.stageRows.length > 0) {
        await tx.importStage.createMany({
          data: validation.stageRows.map((row) =>
            this.toStageCreateData(batch.idImportBatch, row),
          ),
        });
      }

      if (validation.errors.length > 0) {
        await tx.importError.createMany({
          data: validation.errors.map((error) =>
            this.toErrorCreateData(batch.idImportBatch, error),
          ),
        });
      }

      return tx.importBatch.findUnique({
        where: { idImportBatch: batch.idImportBatch },
        include: batchDetailInclude,
      });
    });
  }

  findAll() {
    return this.prisma.importBatch.findMany({
      include: batchDetailInclude,
      orderBy: { idImportBatch: 'desc' },
    });
  }

  async findOne(id: number) {
    const batch = await this.prisma.importBatch.findUnique({
      where: { idImportBatch: id },
      include: batchDetailInclude,
    });
    if (!batch) throw new NotFoundException(`Import batch ${id} was not found`);
    return batch;
  }

  async update(id: number, dto: UpdateImportBatchDto) {
    const data = this.normalizeUpdateData(dto);

    return this.prisma.$transaction(async (tx) => {
      await this.lockImportBatch(tx, id);
      const batch = await tx.importBatch.findUnique({
        where: { idImportBatch: id },
        include: batchDetailInclude,
      });
      if (!batch) {
        throw new NotFoundException(`Import batch ${id} was not found`);
      }
      this.ensureBatchCanMutate(batch.status);

      const sourceChanged =
        dto.source !== undefined && dto.source !== batch.source;
      if (!sourceChanged) {
        return tx.importBatch.update({
          where: { idImportBatch: id },
          data,
          include: batchDetailInclude,
        });
      }

      await tx.importError.deleteMany({
        where: { idImportBatch: id, field: 'source' },
      });
      await tx.importError.create({
        data: {
          idImportBatch: id,
          rowNumber: null,
          field: 'source',
          message: `Source changed from ${batch.source} to ${dto.source}; validate before committing`,
        },
      });

      return tx.importBatch.update({
        where: { idImportBatch: id },
        data: { ...data, status: 'has_errors' },
        include: batchDetailInclude,
      });
    });
  }

  async stageRows(id: number) {
    await this.findOne(id);
    const [stageRows, errors] = await Promise.all([
      this.prisma.importStage.findMany({
        where: { idImportBatch: id },
        include: importStageInclude,
        orderBy: { rowNumber: 'asc' },
      }),
      this.prisma.importError.findMany({
        where: { idImportBatch: id },
        orderBy: [{ rowNumber: 'asc' }, { idImportError: 'asc' }],
      }),
    ]);
    const errorsByRow = new Map<number, typeof errors>();

    for (const error of errors) {
      if (error.rowNumber === null) {
        continue;
      }

      const rowErrors = errorsByRow.get(error.rowNumber) ?? [];
      rowErrors.push(error);
      errorsByRow.set(error.rowNumber, rowErrors);
    }

    return stageRows.map((row) => ({
      ...row,
      errors: errorsByRow.get(row.rowNumber) ?? [],
    }));
  }

  async errors(id: number) {
    await this.findOne(id);
    return this.prisma.importError.findMany({
      where: { idImportBatch: id },
      orderBy: [{ rowNumber: 'asc' }, { idImportError: 'asc' }],
    });
  }

  async updateStageRow(
    idImportBatch: number,
    idImportStage: number,
    dto: { idProject?: number | null },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockImportBatch(tx, idImportBatch);
      const batch = await tx.importBatch.findUnique({
        where: { idImportBatch },
      });
      if (!batch) {
        throw new NotFoundException(`Import batch ${idImportBatch} was not found`);
      }
      this.ensureBatchCanMutate(batch.status);

      const stage = await tx.importStage.findFirst({
        where: { idImportBatch, idImportStage },
      });
      if (!stage) {
        throw new NotFoundException(
          `Import stage row ${idImportStage} was not found`,
        );
      }

      if (dto.idProject !== null && dto.idProject !== undefined) {
        if (stage.idProduct === null) {
          throw new BadRequestException(
            'A matched product is required before selecting a project',
          );
        }

        const project = await tx.project.findFirst({
          where: { idProject: dto.idProject, idProduct: stage.idProduct },
          select: { idProject: true },
        });
        if (!project) {
          throw new BadRequestException(
            `Project ${dto.idProject} does not belong to matched product ${stage.idProduct}`,
          );
        }
      }

      return tx.importStage.update({
        where: { idImportStage },
        data: { idProject: dto.idProject ?? null },
        include: importStageInclude,
      });
    });
  }

  async validate(id: number) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockImportBatch(tx, id);
      const batch = await tx.importBatch.findUnique({
        where: { idImportBatch: id },
        include: { stageRows: { orderBy: { rowNumber: 'asc' } } },
      });
      if (!batch) {
        throw new NotFoundException(`Import batch ${id} was not found`);
      }
      this.ensureBatchCanMutate(batch.status);

      const validation = await this.validator.validateRows(
        batch.source as CreateImportBatchDto['source'],
        batch.stageRows.map((row) => this.toParsedRow(row)),
        tx,
      );
      const stageByRowNumber = await this.applyValidationToStageRows(
        tx,
        batch.stageRows,
        validation.stageRows,
      );
      await this.replaceValidationErrors(
        tx,
        id,
        stageByRowNumber,
        validation.errors,
      );

      return tx.importBatch.update({
        where: { idImportBatch: id },
        data: {
          status: validation.errors.length > 0 ? 'has_errors' : 'validated',
        },
        include: batchDetailInclude,
      });
    });
  }

  async commit(id: number) {
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockImportBatch(tx, id);
      const batch = await tx.importBatch.findUnique({
        where: { idImportBatch: id },
      });
      if (!batch) {
        throw new NotFoundException(`Import batch ${id} was not found`);
      }
      if (batch.status !== 'validated') {
        throw new BadRequestException(
          'Import batch must be validated before commit',
        );
      }

      if (!batch.importDate) {
        throw new BadRequestException('Import date is required before commit');
      }

      const stageRows = await tx.importStage.findMany({
        where: { idImportBatch: id },
        orderBy: { rowNumber: 'asc' },
      });
      if (
        stageRows.length === 0 ||
        stageRows.some((row) => !isCompleteStageRow(row))
      ) {
        throw new BadRequestException('Batch has incomplete staged rows');
      }

      const validation = await this.validator.validateRows(
        batch.source as CreateImportBatchDto['source'],
        stageRows.map((row) => this.toParsedRow(row)),
        tx,
      );
      const stageByRowNumber = await this.applyValidationToStageRows(
        tx,
        stageRows,
        validation.stageRows,
      );
      await this.replaceValidationErrors(
        tx,
        id,
        stageByRowNumber,
        validation.errors,
      );

      if (validation.errors.length > 0) {
        const updatedBatch = await tx.importBatch.update({
          where: { idImportBatch: id },
          data: { status: 'has_errors' },
          include: batchDetailInclude,
        });
        return { rejected: true, batch: updatedBatch };
      }

      if (
        validation.stageRows.length === 0 ||
        validation.stageRows.some((row) => !isCompleteValidatedStageRow(row))
      ) {
        throw new BadRequestException('Batch has incomplete staged rows');
      }

      const saleRows = await Promise.all(
        validation.stageRows.map(async (row) => {
          const idProduct = row.idProduct as number;
          const fee = await this.feeCalculator.calculateFee(
            {
              amount: row.amount,
              idProject: row.idProject as number,
              quantity: row.quantity,
            },
            tx,
          );
          const financials =
            await this.financialsCalculator.calculateFinancials(
              {
                amount: row.amount,
                fee,
                idProduct,
              },
              tx,
            );

          return {
            date: batch.importDate as Date,
            source: batch.source,
            idProduct,
            idProject: row.idProject as number,
            quantity: row.quantity as number,
            amount: row.amount as Prisma.Decimal | number,
            fee,
            feeOverride: false,
            ...financials,
          };
        }),
      );

      await tx.sale.createMany({
        data: saleRows,
      });

      return tx.importBatch.update({
        where: { idImportBatch: id },
        data: { status: 'committed', committedAt: new Date() },
        include: batchDetailInclude,
      });
    });

    if ('rejected' in result && result.rejected) {
      throw new BadRequestException('Batch has validation errors');
    }

    return result;
  }

  async cancel(id: number) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockImportBatch(tx, id);
      const batch = await tx.importBatch.findUnique({
        where: { idImportBatch: id },
        include: batchDetailInclude,
      });
      if (!batch) {
        throw new NotFoundException(`Import batch ${id} was not found`);
      }

      if (batch.status === 'committed') {
        throw new BadRequestException('Committed batches cannot be cancelled');
      }
      if (batch.status === 'cancelled') {
        return batch;
      }

      return tx.importBatch.update({
        where: { idImportBatch: id },
        data: { status: 'cancelled' },
        include: batchDetailInclude,
      });
    });
  }

  private normalizeUpdateData(dto: UpdateImportBatchDto) {
    const data: Prisma.ImportBatchUncheckedUpdateInput = {};

    if (dto.source !== undefined) {
      data.source = dto.source;
    }

    if (dto.importDate !== undefined) {
      const importDate = parseSaleDate(dto.importDate);
      if (!importDate) {
        throw new BadRequestException(
          'Import date must be a valid calendar date in YYYY-MM-DD format',
        );
      }
      data.importDate = importDate;
    }

    return data;
  }

  private ensureBatchCanMutate(status: ImportStatus) {
    if (mutableTerminalStatuses.includes(status)) {
      throw new BadRequestException(
        `Import batch cannot be changed when status is ${status}`,
      );
    }
  }

  private async lockImportBatch(tx: TransactionClient, id: number) {
    await tx.$queryRaw`
      SELECT id_import_batch
      FROM import_batch
      WHERE id_import_batch = ${id}
      FOR UPDATE
    `;
  }

  private async applyValidationToStageRows(
    tx: TransactionClient,
    stageRows: StageForValidationUpdate[],
    validationRows: ImportStageRowData[],
  ) {
    const stageByRowNumber = new Map(
      stageRows.map((row) => [row.rowNumber, row]),
    );

    for (const row of validationRows) {
      const stage = stageByRowNumber.get(row.rowNumber);
      if (stage) {
        await tx.importStage.update({
          where: { idImportStage: stage.idImportStage },
          data: {
            externalProductId: row.externalProductId,
            importedProductDescription: row.importedProductDescription,
            quantity: row.quantity,
            amount: row.amount,
            idProduct: row.idProduct,
            idProject: row.idProject,
          },
        });
      }
    }

    return stageByRowNumber;
  }

  private async replaceValidationErrors(
    tx: TransactionClient,
    idImportBatch: number,
    stageByRowNumber: Map<number, StageForValidationUpdate>,
    errors: ImportRowError[],
  ) {
    await tx.importError.deleteMany({ where: { idImportBatch } });
    if (errors.length > 0) {
      await tx.importError.createMany({
        data: errors.map((error) => ({
          ...this.toErrorCreateData(idImportBatch, error),
          idImportStage:
            stageByRowNumber.get(error.rowNumber)?.idImportStage ?? null,
        })),
      });
    }
  }

  private toStageCreateData(
    idImportBatch: number,
    row: ImportStageRowData,
  ): Prisma.ImportStageCreateManyInput {
    return {
      idImportBatch,
      rowNumber: row.rowNumber,
      externalProductId: row.externalProductId,
      importedProductDescription: row.importedProductDescription,
      idProduct: row.idProduct,
      idProject: row.idProject,
      quantity: row.quantity,
      amount: row.amount,
      rawRow: row.rawRow as Prisma.InputJsonValue,
    };
  }

  private toErrorCreateData(
    idImportBatch: number,
    error: ImportRowError,
  ): Prisma.ImportErrorCreateManyInput {
    return {
      idImportBatch,
      rowNumber: error.rowNumber,
      field: error.field,
      message: error.message,
    };
  }

  private toParsedRow(row: StageForParse): ParsedImportRow {
    return {
      rowNumber: row.rowNumber,
      externalProductId:
        typeof row.externalProductId === 'string'
          ? row.externalProductId
          : null,
      importedProductDescription:
        typeof row.importedProductDescription === 'string'
          ? row.importedProductDescription
          : null,
      quantity: typeof row.quantity === 'number' ? row.quantity : null,
      amount: decimalToNumber(row.amount),
      idProject:
        typeof row.idProject === 'number' && Number.isFinite(row.idProject)
          ? row.idProject
          : null,
      rawRow:
        row.rawRow &&
        typeof row.rawRow === 'object' &&
        !Array.isArray(row.rawRow)
          ? row.rawRow
          : {},
    };
  }
}

function decimalToNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return value;
  }

  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return null;
}

function isCompleteStageRow(row: {
  idProduct: number | null;
  quantity: number | null;
  amount: Prisma.Decimal | number | string | null;
  externalProductId?: string | null;
  importedProductDescription?: string | null;
}): boolean {
  return (
    row.idProduct !== null &&
    row.quantity !== null &&
    row.amount !== null &&
    typeof row.externalProductId === 'string' &&
    row.externalProductId.trim() !== '' &&
    typeof row.importedProductDescription === 'string' &&
    row.importedProductDescription.trim() !== ''
  );
}

function isCompleteValidatedStageRow(row: ImportStageRowData): boolean {
  return isCompleteStageRow(row) && row.idProject !== null;
}
