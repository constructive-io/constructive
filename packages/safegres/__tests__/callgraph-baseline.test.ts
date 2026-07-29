import {
  boundaryKey,
  type CallGraphBaseline,
  diffCallGraph,
  parseBaseline,
  serializeBaseline,
  toBaseline
} from '../src/callgraph/baseline';
import type { CallGraphReport, ChecklistItem } from '../src/callgraph/graph';

function item(partial: Partial<ChecklistItem> & Pick<ChecklistItem, 'code' | 'fn'>): ChecklistItem {
  return {
    entry: partial.entry ?? partial.fn,
    path: partial.path ?? [partial.fn],
    message: partial.message ?? 'msg',
    ...partial
  };
}

function report(checklist: ChecklistItem[]): CallGraphReport {
  return {
    entries: [],
    nodes: [],
    edges: [],
    checklist,
    stats: {
      entryPoints: 0,
      reachableFunctions: 0,
      trustHops: 0,
      rlsBypassPaths: 0,
      authContextMutations: 0,
      internalReach: 0,
      opaqueNodes: 0
    }
  };
}

const signIn = item({ code: 'CG1', fn: 'priv.verify', entry: 'pub.sign_in', path: ['pub.sign_in', 'priv.verify'] });
const bypass = item({ code: 'CG2', fn: 'priv.verify', entry: 'pub.sign_in', table: 'priv.users' });

describe('toBaseline / serialize / parse', () => {
  it('stores only boundary identity, deduplicated and sorted', () => {
    const b = toBaseline(report([bypass, signIn, signIn]));
    expect(b.boundaries).toEqual([
      { code: 'CG1', entry: 'pub.sign_in', fn: 'priv.verify' },
      { code: 'CG2', entry: 'pub.sign_in', fn: 'priv.verify', table: 'priv.users' }
    ]);
  });

  it('round-trips through serialize/parse', () => {
    const b = toBaseline(report([signIn, bypass]));
    expect(parseBaseline(serializeBaseline(b))).toEqual(b);
  });

  it('rejects malformed baselines', () => {
    expect(() => parseBaseline('{"boundaries": []}')).toThrow(/invalid call-graph baseline/);
    expect(() => parseBaseline('{"version": 1}')).toThrow(/invalid call-graph baseline/);
  });
});

describe('diffCallGraph', () => {
  const baseline: CallGraphBaseline = toBaseline(report([signIn]));

  it('reports no changes when the checklist matches the baseline', () => {
    const diff = diffCallGraph(report([signIn]), baseline);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it('reports new boundaries as added', () => {
    const diff = diffCallGraph(report([signIn, bypass]), baseline);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]).toMatchObject({ code: 'CG2', table: 'priv.users' });
    expect(diff.removed).toEqual([]);
  });

  it('reports resolved boundaries as removed', () => {
    const diff = diffCallGraph(report([bypass]), toBaseline(report([signIn, bypass])));
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([{ code: 'CG1', entry: 'pub.sign_in', fn: 'priv.verify' }]);
  });

  it('ignores message/path rewording — identity is code+entry+fn+table', () => {
    const reworded = item({ ...signIn, message: 'different wording', path: ['pub.sign_in', 'x', 'priv.verify'] });
    const diff = diffCallGraph(report([reworded]), baseline);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });
});

describe('boundaryKey', () => {
  it('is stable and distinguishes tables', () => {
    expect(boundaryKey({ code: 'CG2', entry: 'e', fn: 'f', table: 't' })).toBe('CG2|e|f|t');
    expect(boundaryKey({ code: 'CG2', entry: 'e', fn: 'f' })).toBe('CG2|e|f|');
  });
});
