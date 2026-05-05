export const IMPORT_SOURCES = ['ecommerce', 'store', 'event', 'surface'] as const;

export type ImportSource = (typeof IMPORT_SOURCES)[number];

export const PRODUCT_EXTERNAL_ID_FIELD_BY_SOURCE: Record<ImportSource, string> = {
  ecommerce: 'idEcommerce',
  store: 'idStore',
  event: 'idEvent',
  surface: 'idSurface',
};

export function isImportSource(value: string): value is ImportSource {
  return IMPORT_SOURCES.includes(value as ImportSource);
}

export function getProductExternalIdField(source: string): string {
  if (!isImportSource(source)) {
    throw new Error(`Unsupported import source: ${source}`);
  }

  return PRODUCT_EXTERNAL_ID_FIELD_BY_SOURCE[source];
}
