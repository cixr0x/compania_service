import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns a healthy status payload with an ISO timestamp', () => {
    const controller = new HealthController();

    const result = controller.getHealth();

    expect(result.status).toBe('ok');
    expect(result.timestamp).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });
});
