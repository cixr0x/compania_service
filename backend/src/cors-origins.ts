const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
];

export function resolveCorsOrigin(
  configuredOrigin: string | undefined,
): string | string[] {
  const origins = configuredOrigin
    ? configuredOrigin
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : DEFAULT_CORS_ORIGINS;

  return origins.length === 1 ? origins[0] : origins;
}
