import { Injectable } from '@nestjs/common';
import {
  getProductExternalIdField,
  ImportSource,
} from '../common/constants/import-sources';
import { PrismaService } from '../prisma/prisma.service';

export type ParsedImportRow = {
  rowNumber: number;
  externalProductId: string | null;
  importedProductDescription: string | null;
  idProject?: number | null;
  quantity: number | null;
  amount: number | null;
  rawRow: Record<string, unknown>;
};

export type ImportRowError = {
  rowNumber: number;
  field: string;
  message: string;
};

export type ImportStageRowData = ParsedImportRow & {
  idProduct: number | null;
  idProject: number | null;
};

type ProductLookup = {
  id: number;
  projects: { idProject: number }[];
  [field: string]: number | string | null | { idProject: number }[];
};
type ProductLookupClient = {
  product: Pick<PrismaService['product'], 'findMany'>;
};

@Injectable()
export class ImportValidatorService {
  constructor(private readonly prisma: PrismaService) {}

  async validateRows(
    source: ImportSource,
    rows: ParsedImportRow[],
    client: ProductLookupClient = this.prisma,
  ): Promise<{ stageRows: ImportStageRowData[]; errors: ImportRowError[] }> {
    const externalIdField = getProductExternalIdField(source);
    const externalIds = [
      ...new Set(
        rows
          .map((row) => normalizeString(row.externalProductId))
          .filter((value): value is string => value !== null),
      ),
    ];
    const products = await this.findProducts(
      client,
      externalIdField,
      externalIds,
    );
    const productsByExternalId = new Map<string, ProductLookup>();

    for (const product of products) {
      const externalId = product[externalIdField];
      if (typeof externalId === 'string' && externalId.trim() !== '') {
        productsByExternalId.set(externalId, product);
      }
    }

    const errors: ImportRowError[] = [];
    const stageRows = rows.map((row) => {
      const externalProductId = normalizeString(row.externalProductId);
      const importedProductDescription = normalizeString(
        row.importedProductDescription,
      );
      const product = externalProductId
        ? productsByExternalId.get(externalProductId)
        : undefined;

      if (!externalProductId) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'externalProductId',
          message: 'External product ID is required',
        });
      }

      if (!importedProductDescription) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'importedProductDescription',
          message: 'Imported product description is required',
        });
      }

      if (
        typeof row.quantity !== 'number' ||
        !Number.isInteger(row.quantity) ||
        row.quantity <= 0
      ) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'quantity',
          message: 'Quantity must be an integer greater than 0',
        });
      }

      if (
        typeof row.amount !== 'number' ||
        !Number.isFinite(row.amount) ||
        row.amount < 0
      ) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'amount',
          message: 'Amount must be a number greater than or equal to 0',
        });
      }

      if (externalProductId && !product) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'externalProductId',
          message: `No product matched external ID ${externalProductId} for source ${source}`,
        });
      }

      if (
        externalProductId &&
        product &&
        (!Array.isArray(product.projects) || product.projects.length === 0)
      ) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'idProject',
          message: `Matched product ${externalProductId} does not have any projects`,
        });
      }

      const idProject = resolveProjectId(row.idProject, product);

      if (externalProductId && product && product.projects.length > 1) {
        if (row.idProject === null || row.idProject === undefined) {
          errors.push({
            rowNumber: row.rowNumber,
            field: 'idProject',
            message: `Select a project for matched product ${externalProductId}`,
          });
        } else if (idProject === null) {
          errors.push({
            rowNumber: row.rowNumber,
            field: 'idProject',
            message: `Project ${row.idProject} does not belong to matched product ${externalProductId}`,
          });
        }
      }

      return {
        rowNumber: row.rowNumber,
        externalProductId,
        importedProductDescription,
        quantity: row.quantity,
        amount: row.amount,
        rawRow: row.rawRow,
        idProduct: product?.id ?? null,
        idProject,
      };
    });

    return { stageRows, errors };
  }

  private findProducts(
    client: ProductLookupClient,
    externalIdField: string,
    externalIds: string[],
  ) {
    if (externalIds.length === 0) {
      return Promise.resolve([] as ProductLookup[]);
    }

    return client.product.findMany({
      where: { [externalIdField]: { in: externalIds } },
      select: {
        id: true,
        [externalIdField]: true,
        projects: {
          select: { idProject: true },
        },
      },
    }) as unknown as Promise<ProductLookup[]>;
  }
}

function resolveProjectId(
  selectedProjectId: number | null | undefined,
  product: ProductLookup | undefined,
) {
  if (!product || !Array.isArray(product.projects) || product.projects.length === 0) {
    return null;
  }

  if (product.projects.length === 1) {
    return product.projects[0].idProject;
  }

  if (typeof selectedProjectId !== 'number') {
    return null;
  }

  return product.projects.some((project) => project.idProject === selectedProjectId)
    ? selectedProjectId
    : null;
}

function normalizeString(value: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
