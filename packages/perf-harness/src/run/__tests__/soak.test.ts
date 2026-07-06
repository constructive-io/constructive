import { SOAK_STOP_ORDER } from '../soak';

describe('SOAK_STOP_ORDER', () => {
  test('is the exact ordered fan-out from the DESIGN contract', () => {
    expect(SOAK_STOP_ORDER).toEqual(['harness', 'collector', 'churn', 'soak-ops', 'pg-sampler', 'server']);
  });

  test('the harness is stopped first (so it flushes its final report before the server dies)', () => {
    expect(SOAK_STOP_ORDER[0]).toBe('harness');
  });

  test('the server is stopped last (load components flush against a live server)', () => {
    expect(SOAK_STOP_ORDER[SOAK_STOP_ORDER.length - 1]).toBe('server');
  });

  test('covers every soak component exactly once', () => {
    expect([...SOAK_STOP_ORDER].sort()).toEqual(['churn', 'collector', 'harness', 'pg-sampler', 'server', 'soak-ops']);
    expect(new Set(SOAK_STOP_ORDER).size).toBe(SOAK_STOP_ORDER.length);
  });
});
