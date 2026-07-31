import {
  diffPerf,
  findingKey,
  parsePerfBaseline,
  serializePerfBaseline,
  subjectOf,
  toPerfBaseline
} from '../src/perf/baseline';
import type { Finding } from '../src/types';

function finding(over: Partial<Finding> = {}): Finding {
  return {
    code: 'X1',
    severity: 'medium',
    category: 'index',
    schema: 'app_public',
    table: 'posts',
    message: 'foreign key with no covering index',
    dimension: 'perf',
    ...over
  };
}

describe('perf baseline', () => {
  it('identifies findings by code + relation + policy + subject, not by message', () => {
    const before = finding({ context: { constraint: 'posts_author_id_fkey' } });
    const after = finding({
      message: 'reworded in a later safegres release',
      severity: 'high',
      context: { constraint: 'posts_author_id_fkey' }
    });
    expect(findingKey(toPerfBaseline([before]).findings[0]))
      .toBe(findingKey(toPerfBaseline([after]).findings[0]));
    expect(diffPerf([after], toPerfBaseline([before])).added).toHaveLength(0);
  });

  it('separates two findings of the same code on the same table', () => {
    const a = finding({ context: { constraint: 'posts_author_id_fkey' } });
    const b = finding({ context: { constraint: 'posts_org_id_fkey' } });
    const baseline = toPerfBaseline([a]);
    const diff = diffPerf([a, b], baseline);
    expect(diff.added).toEqual([b]);
    expect(diff.accepted).toEqual([a]);
    expect(diff.removed).toHaveLength(0);
  });

  it('reports baseline entries that no longer occur as fixed', () => {
    const a = finding({ context: { constraint: 'posts_author_id_fkey' } });
    const diff = diffPerf([], toPerfBaseline([a]));
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toEqual([
      { code: 'X1', schema: 'app_public', table: 'posts', subject: 'posts_author_id_fkey' }
    ]);
  });

  it('keys policy-scoped findings by policy', () => {
    const x2a = finding({ code: 'X2', policy: 'posts_tenant', context: { column: 'tenant_id' } });
    const x2b = finding({ code: 'X2', policy: 'posts_author', context: { column: 'tenant_id' } });
    expect(diffPerf([x2a, x2b], toPerfBaseline([x2a])).added).toEqual([x2b]);
  });

  it('derives the subject from the rule-specific context key', () => {
    expect(subjectOf(finding({ context: { index: 'posts_tenant_idx' } }))).toBe('posts_tenant_idx');
    expect(subjectOf(finding({ context: { column: 'tenant_id' } }))).toBe('tenant_id');
    // X3 carries both — the expression is the narrower identity.
    expect(subjectOf(finding({ context: { column: 'tenant_id', expression: 'tenant_id::text' } })))
      .toBe('tenant_id::text');
    // X6 fires at most once per relation, so it needs no subject.
    expect(subjectOf(finding({ code: 'X6', context: { replicaIdentity: 'd' } }))).toBeUndefined();
    expect(subjectOf(finding())).toBeUndefined();
  });

  it('round-trips deterministically through JSON', () => {
    const findings = [
      finding({ context: { constraint: 'b_fkey' } }),
      finding({ table: 'aaa', context: { constraint: 'a_fkey' } })
    ];
    const serialized = serializePerfBaseline(toPerfBaseline(findings));
    expect(serialized.endsWith('\n')).toBe(true);
    const reparsed = parsePerfBaseline(serialized);
    expect(reparsed).toEqual(toPerfBaseline(findings));
    // Sorted by key, so re-running the audit can't churn the committed file.
    expect(reparsed.findings.map((f) => f.table)).toEqual(['aaa', 'posts']);
    // Duplicate findings collapse to one entry.
    expect(toPerfBaseline([findings[0], findings[0]]).findings).toHaveLength(1);
  });

  it('rejects a malformed baseline file', () => {
    expect(() => parsePerfBaseline('{"version":2,"findings":[]}')).toThrow(/invalid perf baseline/);
    expect(() => parsePerfBaseline('{"version":1}')).toThrow(/invalid perf baseline/);
  });
});
