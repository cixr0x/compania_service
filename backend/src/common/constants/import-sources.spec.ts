import { getProductExternalIdField, IMPORT_SOURCES } from './import-sources';

describe('import source mapping', () => {
  it('maps each supported import source to the correct product external ID field', () => {
    expect(IMPORT_SOURCES).toEqual(['ecommerce', 'store', 'event', 'surface']);
    expect(getProductExternalIdField('ecommerce')).toBe('idEcommerce');
    expect(getProductExternalIdField('store')).toBe('idStore');
    expect(getProductExternalIdField('event')).toBe('idEvent');
    expect(getProductExternalIdField('surface')).toBe('idSurface');
  });

  it('rejects unsupported import sources', () => {
    expect(() => getProductExternalIdField('marketplace')).toThrow(
      'Unsupported import source: marketplace',
    );
  });
});
