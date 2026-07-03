import { mergeStepConfig } from '../ramp';

describe('mergeStepConfig', () => {
  test('step fields override plan defaults; unspecified defaults survive', () => {
    const defaults = {
      heapMb: 2048,
      rps: 10,
      durationSec: 420,
      shape: 'uniform',
      auth: 1,
      mix: 'read:0.7,write:0.25,meta:0.05'
    };
    const step = { name: 'div-k3', fleet: 'out/fleet-k3.json', rps: 25 };
    const cfg = mergeStepConfig(defaults, step);

    expect(cfg.rps).toBe(25); // step wins
    expect(cfg.heapMb).toBe(2048); // default survives
    expect(cfg.shape).toBe('uniform');
    expect(cfg.mix).toBe('read:0.7,write:0.25,meta:0.05');
    expect(cfg.name).toBe('div-k3'); // step-only field present
    expect(cfg.fleet).toBe('out/fleet-k3.json');
  });

  test('does not mutate defaults or step', () => {
    const defaults = { heapMb: 2048, rps: 10 };
    const step = { name: 'x', rps: 25 };
    mergeStepConfig(defaults, step);
    expect(defaults).toEqual({ heapMb: 2048, rps: 10 });
    expect(step).toEqual({ name: 'x', rps: 25 });
  });

  test('coldBurst flag and heapMb override flow through', () => {
    const cfg = mergeStepConfig({ heapMb: 2048, rps: 10 }, { name: 'cb', fleet: 'f.json', coldBurst: true, heapMb: 896 });
    expect(cfg.coldBurst).toBe(true);
    expect(cfg.heapMb).toBe(896); // step overrides
    expect(cfg.rps).toBe(10); // default survives
  });

  test('an empty step yields the defaults verbatim (plus its name)', () => {
    const defaults = { heapMb: 2048, rps: 10, shape: 'zipf' };
    expect(mergeStepConfig(defaults, { name: 'only-name' })).toEqual({ heapMb: 2048, rps: 10, shape: 'zipf', name: 'only-name' });
  });

  test('nested serverEnv from the step replaces (does not deep-merge) the default', () => {
    const cfg = mergeStepConfig({ serverEnv: { A: '1' } }, { name: 's', serverEnv: { B: '2' } });
    expect(cfg.serverEnv).toEqual({ B: '2' }); // shallow spread — step wins wholesale
  });
});
