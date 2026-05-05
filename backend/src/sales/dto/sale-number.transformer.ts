export function transformSaleNumber(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim() === '' ? value : Number(value);
}
