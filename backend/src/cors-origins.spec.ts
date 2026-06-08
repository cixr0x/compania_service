import { resolveCorsOrigin } from './cors-origins';

describe('resolveCorsOrigin', () => {
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
