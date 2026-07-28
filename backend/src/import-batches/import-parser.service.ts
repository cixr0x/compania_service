import { BadRequestException, Injectable } from '@nestjs/common';
import { parse as parseCsv } from 'csv-parse/sync';
import type { Workbook as WorkbookType } from 'exceljs';
import { createRequire } from 'node:module';
import { extname } from 'path';
import { ParsedImportRow } from './import-validator.service';

const requireModule = createRequire(__filename);

const HEADER_ALIASES = {
  externalProductId: new Set(['externalproductid', 'externalid', 'id']),
  importedProductDescription: new Set(['productdescription', 'description']),
  quantity: new Set(['quantity', 'qty']),
  amount: new Set(['amount', 'total']),
};

@Injectable()
export class ImportParserService {
  async parse(file: Express.Multer.File): Promise<ParsedImportRow[]> {
    const extension = extname(file.originalname).toLowerCase();

    if (extension === '.csv') {
      return this.parseCsv(file.buffer);
    }

    if (extension === '.xlsx') {
      return this.parseXlsx(file.buffer);
    }

    throw new BadRequestException('Only CSV and XLSX files are supported');
  }

  private parseCsv(buffer: Buffer): ParsedImportRow[] {
    const records = parseCsv<{
      record: Record<string, unknown>;
      info: { lines: number };
    }>(buffer, {
      bom: true,
      columns: true,
      info: true,
      skip_empty_lines: true,
      trim: false,
    });

    return records.map(({ record, info }) =>
      this.toParsedRow(info.lines, record),
    );
  }

  private async parseXlsx(buffer: Buffer): Promise<ParsedImportRow[]> {
    const workbook: WorkbookType = new (loadExcelJS().Workbook)();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return [];
    }

    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    for (let column = 1; column <= worksheet.columnCount; column += 1) {
      headers[column] = cellToString(headerRow.getCell(column).value);
    }

    const rows: ParsedImportRow[] = [];
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const worksheetRow = worksheet.getRow(rowNumber);
      const rawRow: Record<string, unknown> = {};

      for (let column = 1; column <= worksheet.columnCount; column += 1) {
        const header = headers[column];
        if (header) {
          rawRow[header] = cellToString(worksheetRow.getCell(column).value);
        }
      }

      if (Object.values(rawRow).every((value) => value === '')) {
        continue;
      }

      rows.push(this.toParsedRow(rowNumber, rawRow));
    }

    return rows;
  }

  private toParsedRow(
    rowNumber: number,
    rawRow: Record<string, unknown>,
  ): ParsedImportRow {
    return {
      rowNumber,
      externalProductId: stringField(rawRow, HEADER_ALIASES.externalProductId),
      importedProductDescription: stringField(
        rawRow,
        HEADER_ALIASES.importedProductDescription,
      ),
      quantity: numericField(rawRow, HEADER_ALIASES.quantity),
      amount: numericField(rawRow, HEADER_ALIASES.amount),
      rawRow,
    };
  }
}

function loadExcelJS(): typeof import('exceljs') {
  const excelJsModule: unknown = requireModule(
    'exceljs/dist/es5/exceljs.nodejs',
  );
  return excelJsModule as typeof import('exceljs');
}

function stringField(
  row: Record<string, unknown>,
  aliases: Set<string>,
): string | null {
  const value = findValue(row, aliases);
  if (value === undefined || value === null) {
    return null;
  }

  return valueToString(value).trim();
}

function numericField(
  row: Record<string, unknown>,
  aliases: Set<string>,
): number | null {
  const value = findValue(row, aliases);
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function findValue(
  row: Record<string, unknown>,
  aliases: Set<string>,
): unknown {
  for (const [key, value] of Object.entries(row)) {
    if (aliases.has(normalizeHeader(key))) {
      return value;
    }
  }

  return undefined;
}

function normalizeHeader(header: string): string {
  return header.replace(/[\s_]/g, '').trim().toLowerCase();
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object' && 'text' in value) {
    return valueToString(value.text);
  }

  if (typeof value === 'object' && 'result' in value) {
    return valueToString(value.result);
  }

  return valueToString(value);
}

function valueToString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint' ||
    typeof value === 'symbol'
  ) {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toString();
  }

  if (typeof value === 'function') {
    return Function.prototype.toString.call(value);
  }

  return Object.prototype.toString.call(value);
}
