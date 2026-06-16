import { resolveCorsOrigin } from './cors-origins';

describe('resolveCorsOrigin', () => {
  it('allows common local Vite origins by default', () => {
    expect(resolveCorsOrigin(undefined)).toEqual([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5175',
    ]);
  });

  it('keeps a single configured origin as a string', () => {
    expect(resolveCorsOrigin('http://localhost:5174')).toBe(
      'http://localhost:5174',
    );
  });

  it('parses comma-separated configured origins as a trimmed list', () => {
    expect(
      resolveCorsOrigin(
        'http://localhost:5174, http://127.0.0.1:5174, ,',
      ),
    ).toEqual(['http://localhost:5174', 'http://127.0.0.1:5174']);
  });
});
