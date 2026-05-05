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

const batchDetailInclude = {
  _count: { select: { stageRows: true, errors: true } },
};

const mutableTerminalStatuses: ImportStatus[] = ['committed', 'cancelled'];
type StageForParse = {
  rowNumber: number;
  externalProductId: string | null;
  importedProductDescription: string | null;
  quantity: number | null;
  amount: Prisma.Decimal | number | string | null;
  rawRow: Prisma.JsonValue | null;
};

@Injectable()
export class ImportBatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: ImportParserService,
    private readonly validator: ImportValidatorService,
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
    const batch = await this.findOne(id);
    this.ensureBatchCanMutate(batch.status);
    const data = this.normalizeUpdateData(dto);
    const sourceChanged =
      dto.source !== undefined && dto.source !== batch.source;

    if (!sourceChanged) {
      return this.prisma.importBatch.update({
        where: { idImportBatch: id },
        data,
        include: batchDetailInclude,
      });
    }

    return this.prisma.$transaction(async (tx) => {
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
        include: { product: true },
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

  async validate(id: number) {
    const batch = await this.prisma.importBatch.findUnique({
      where: { idImportBatch: id },
      include: { stageRows: { orderBy: { rowNumber: 'asc' } } },
    });
    if (!batch) throw new NotFoundException(`Import batch ${id} was not found`);
    this.ensureBatchCanMutate(batch.status);

    const validation = await this.validator.validateRows(
      batch.source as CreateImportBatchDto['source'],
      batch.stageRows.map((row) => this.toParsedRow(row)),
    );

    return this.prisma.$transaction(async (tx) => {
      const stageByRowNumber = new Map(
        batch.stageRows.map((row) => [row.rowNumber, row]),
      );

      for (const row of validation.stageRows) {
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
            },
          });
        }
      }

      await tx.importError.deleteMany({ where: { idImportBatch: id } });
      if (validation.errors.length > 0) {
        await tx.importError.createMany({
          data: validation.errors.map((error) => ({
            ...this.toErrorCreateData(id, error),
            idImportStage:
              stageByRowNumber.get(error.rowNumber)?.idImportStage ?? null,
          })),
        });
      }

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
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.importBatch.findUnique({
        where: { idImportBatch: id },
      });
      if (!batch) {
        throw new NotFoundException(`Import batch ${id} was not found`);
      }
      this.ensureBatchCanMutate(batch.status);

      if (!batch.importDate) {
        throw new BadRequestException('Import date is required before commit');
      }

      const errorCount = await tx.importError.count({
        where: { idImportBatch: id },
      });
      if (errorCount > 0) {
        throw new BadRequestException('Batch has validation errors');
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

      await tx.sale.createMany({
        data: stageRows.map((row) => ({
          date: batch.importDate as Date,
          source: batch.source,
          idProduct: row.idProduct as number,
          quantity: row.quantity as number,
          amount: row.amount as Prisma.Decimal | number,
          fee: 0,
        })),
      });

      return tx.importBatch.update({
        where: { idImportBatch: id },
        data: { status: 'committed', committedAt: new Date() },
        include: batchDetailInclude,
      });
    });
  }

  async cancel(id: number) {
    const batch = await this.findOne(id);
    if (batch.status === 'committed') {
      throw new BadRequestException('Committed batches cannot be cancelled');
    }
    if (batch.status === 'cancelled') {
      return batch;
    }

    return this.prisma.importBatch.update({
      where: { idImportBatch: id },
      data: { status: 'cancelled' },
      include: batchDetailInclude,
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

  private ensureBatchCanMutate(status: ImportStatus | string) {
    if (mutableTerminalStatuses.includes(status as ImportStatus)) {
      throw new BadRequestException(
        `Import batch cannot be changed when status is ${status}`,
      );
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
      rawRow:
        row.rawRow &&
        typeof row.rawRow === 'object' &&
        !Array.isArray(row.rawRow)
          ? (row.rawRow as Record<string, unknown>)
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
