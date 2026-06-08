const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';

export function resolveCorsOrigin(
  configuredOrigin: string | undefined,
): string | string[] {
  const origins = (configuredOrigin ?? DEFAULT_CORS_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length === 1 ? origins[0] : origins;
}
