import { formatStepRecord } from '../summarize';

describe('formatStepRecord', () => {
  const healthy: any = {
    name: 'rps-200',
    serverCrashed: null,
    error: null,
    summary: {
      achievedRps: 188.4,
      completed: 79128,
      errRate: 0,
      latency: { count: 82000, min: 3, mean: 12, p50: 13, p95: 21, p99: 21, max: 67 },
      http: { '200': 82000 },
      sentinelOk: true,
      verdict: { pass: true, bleedViolations: 0 }
    },
    metrics: {
      samples: 99,
      rssMaxMB: 2201.3,
      heapUsedMaxMB: 1588.2,
      heapUsedLastMB: 1500,
      buildQueueDepthMax: 0,
      lastCache: { size: 1, keys: 1 },
      lastCounters: {
        evictions: { lru: 1, ttl: 0, manual: 0, governor: 0 },
        disposals: 0,
        drainTimeouts: 0,
        buildRefusals: 0,
        builds: 2,
        connGuard: { absorbedExceptions: 0, absorbedRejections: 0 }
      }
    },
    pgBackends: { max: 5, samples: 99, err: null },
    wallSec: 510
  };

  test('formats a healthy step with every field present', () => {
    const line = formatStepRecord(healthy);
    // first pipe-segment is the step name
    expect(line.split(' | ')[0]).toBe('rps-200');
    expect(line).toContain('crashed=false');
    expect(line).toContain('err=-');
    expect(line).toContain('errRate=0');
    expect(line).toContain('rps=188.4');
    expect(line).toContain('p50/p95/p99=13/21/21');
    expect(line).toContain('http={"200":82000}');
    expect(line).toContain('sentinelOk=true');
    expect(line).toContain('heapMax=1588.2MB');
    expect(line).toContain('rssMax=2201.3MB');
    expect(line).toContain('queueMax=0');
    expect(line).toContain('evict={"lru":1,"ttl":0,"manual":0,"governor":0}');
    expect(line).toContain('builds=2');
    expect(line).toContain('connGuard={"absorbedExceptions":0,"absorbedRejections":0}');
    expect(line).toContain('pgConnMax=5');
    expect(line).toContain('wall=510s');
    // no cold-burst blob for a normal step
    expect(line).not.toContain('cold=');
  });

  test('renders a crashed step with the serialized exit', () => {
    const crashed: any = {
      name: 'div-k1',
      serverCrashed: true,
      serverExit: { code: null, signal: 'SIGABRT' },
      error: null,
      wallSec: 40
    };
    const line = formatStepRecord(crashed);
    expect(line).toContain('crashed={"code":null,"signal":"SIGABRT"}');
    expect(line).toContain('wall=40s');
    // absent summary/metrics fields are simply omitted
    expect(line).not.toContain('errRate=');
    expect(line).not.toContain('heapMax=');
  });

  test('emits the cold-burst summary blob when coldBurst is present', () => {
    const cold: any = {
      name: 'cold-burst',
      serverCrashed: null,
      error: null,
      coldBurst: { wave1: [], wave2: [] },
      summary: { coldOk: 0, cold503: 0, coldErr: 5, coldMsMax: 6841, warmMsMax: 58 },
      wallSec: 120
    };
    const line = formatStepRecord(cold);
    expect(line).toContain('cold=');
    expect(line).toContain('"coldErr":5');
    expect(line).toContain('wall=120s');
  });

  test('shows reconnects on pgBackends only when non-zero', () => {
    const withReconn = formatStepRecord({ name: 'x', pgBackends: { max: 7, reconnects: 3 }, wallSec: 1 });
    expect(withReconn).toContain('pgConnMax=7 reconn=3');
    const noReconn = formatStepRecord({ name: 'x', pgBackends: { max: 7, reconnects: 0 }, wallSec: 1 });
    expect(noReconn).toContain('pgConnMax=7');
    expect(noReconn).not.toContain('reconn=');
  });
});
