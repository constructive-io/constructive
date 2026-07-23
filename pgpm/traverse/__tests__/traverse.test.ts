import { forEachScript, mapScripts, SCRIPT_KINDS, ScriptSlots, zipScripts } from '../src';

interface Script {
  kind: string;
  value: number;
}

const slots = (deploy: number | null, revert: number | null, verify: number | null): ScriptSlots<Script> => ({
  deploy: deploy == null ? null : { kind: 'deploy', value: deploy },
  revert: revert == null ? null : { kind: 'revert', value: revert },
  verify: verify == null ? null : { kind: 'verify', value: verify }
});

describe('SCRIPT_KINDS', () => {
  it('is deploy/revert/verify in canonical order', () => {
    expect(SCRIPT_KINDS).toEqual(['deploy', 'revert', 'verify']);
  });
});

describe('forEachScript', () => {
  it('visits present slots in deploy→revert→verify order, skipping nulls', () => {
    const seen: Array<[string, number]> = [];
    forEachScript(slots(1, null, 3), (s, kind) => seen.push([kind, s.value]));
    expect(seen).toEqual([
      ['deploy', 1],
      ['verify', 3]
    ]);
  });

  it('visits nothing when all slots are absent', () => {
    const seen: string[] = [];
    forEachScript(slots(null, null, null), (_s, kind) => seen.push(kind));
    expect(seen).toEqual([]);
  });
});

describe('mapScripts', () => {
  it('maps present slots and preserves nulls', () => {
    const out = mapScripts(slots(1, null, 3), s => s.value * 10);
    expect(out).toEqual({ deploy: 10, revert: null, verify: 30 });
  });

  it('clears a slot when the mapper returns null', () => {
    const out = mapScripts(slots(1, 2, 3), (s, kind) => (kind === 'revert' ? null : s.value));
    expect(out).toEqual({ deploy: 1, revert: null, verify: 3 });
  });

  it('passes the kind to the mapper', () => {
    const out = mapScripts(slots(1, 2, 3), (_s, kind) => kind);
    expect(out).toEqual({ deploy: 'deploy', revert: 'revert', verify: 'verify' });
  });
});

describe('zipScripts', () => {
  it('visits every kind with both sides (nullable)', () => {
    const seen: Array<[string, number | null, number | null]> = [];
    zipScripts(slots(1, 2, null), slots(1, null, 5), (kind, a, b) =>
      seen.push([kind, a?.value ?? null, b?.value ?? null])
    );
    expect(seen).toEqual([
      ['deploy', 1, 1],
      ['revert', 2, null],
      ['verify', null, 5]
    ]);
  });
});
