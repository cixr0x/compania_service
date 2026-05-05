import { BadRequestException, Injectable } from '@nestjs/common';
import { parse as parseCsv } from 'csv-parse/sync';
import type { Workbook as WorkbookType } from 'exceljs';
import { extname } from 'path';
import { ParsedImportRow } from './import-validator.service';

const HEADER_ALIASES = {
  externalProductId: new Set(['externalproductid', 'id']),
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
    const records = parseCsv(buffer, {
      bom: true,
      columns: true,
      skip_empty_lines: true,
      trim: false,
    }) as Record<string, unknown>[];

    return records.map((record, index) => this.toParsedRow(index + 2, record));
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
  return require('exceljs/dist/es5/exceljs.nodejs') as typeof import('exceljs');
}

function stringField(
  row: Record<string, unknown>,
  aliases: Set<string>,
): string | null {
  const value = findValue(row, aliases);
  if (value === undefined || value === null) {
    return null;
  }

  return String(value).trim();
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
): unknown | undefined {
  for (const [key, value] of Object.entries(row)) {
    if (aliases.has(normalizeHeader(key))) {
      return value;
    }
  }

  return undefined;
}

function normalizeHeader(header: string): string {
  return header.replace(/_/g, '').trim().toLowerCase();
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object' && 'text' in value) {
    return String((value as { text: unknown }).text);
  }

  if (typeof value === 'object' && 'result' in value) {
    return String((value as { result: unknown }).result ?? '');
  }

  return String(value);
}
