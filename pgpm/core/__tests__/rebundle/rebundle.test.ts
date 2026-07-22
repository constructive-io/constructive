import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import {
  assembleChunkSql,
  rebundlePlan,
  verifyRebundleInvariant,
} from '../../src/rebundle';
import { resolveWithPlan } from '../../src/resolution/resolve';

let moduleDir: string;

const PLAN = `%syntax-version=1.0.0
%project=my-module
%uri=my-module

schemas/auth/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # add schema
schemas/auth/tables/users [schemas/auth/schema] 2024-01-01T00:00:01Z Dev <dev@example.com> # users
schemas/auth/tables/sessions [schemas/auth/tables/users] 2024-01-01T00:00:02Z Dev <dev@example.com> # sessions
schemas/billing/schema [schemas/auth/schema] 2024-01-01T00:00:03Z Dev <dev@example.com> # billing schema
schemas/billing/tables/invoices [schemas/billing/schema schemas/auth/tables/users] 2024-01-01T00:00:04Z Dev <dev@example.com> # invoices
@v1.0.0 2024-01-01T00:00:05Z Dev <dev@example.com> # release
`;

const CHANGES = [
  'schemas/auth/schema',
  'schemas/auth/tables/users',
  'schemas/auth/tables/sessions',
  'schemas/billing/schema',
  'schemas/billing/tables/invoices',
];

function writeScript(rel: string, content: string): void {
  const file = join(moduleDir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

beforeEach(() => {
  moduleDir = mkdtempSync(join(tmpdir(), 'pgpm-rebundle-'));
  writeFileSync(join(moduleDir, 'pgpm.plan'), PLAN);

  for (const change of CHANGES) {
    writeScript(`deploy/${change}.sql`, `-- Deploy ${change}\nCREATE /* ${change} */ ;\n`);
    writeScript(`revert/${change}.sql`, `-- Revert ${change}\nDROP /* ${change} */ ;\n`);
    writeScript(`verify/${change}.sql`, `-- Verify ${change}\nSELECT '${change}';\n`);
  }
});

afterEach(() => {
  rmSync(moduleDir, { recursive: true, force: true });
});

describe('rebundlePlan', () => {
  it('groups changes into folder-derived chunks by default', () => {
    const result = rebundlePlan(moduleDir);
    expect(result.deployOrder).toEqual(['auth', 'billing']);

    const auth = result.chunks.find(c => c.name === 'auth')!;
    const billing = result.chunks.find(c => c.name === 'billing')!;

    expect(auth.deploy).toEqual([
      'schemas/auth/schema',
      'schemas/auth/tables/users',
      'schemas/auth/tables/sessions',
    ]);
    expect(billing.deploy).toEqual([
      'schemas/billing/schema',
      'schemas/billing/tables/invoices',
    ]);
  });

  it('records verify order as deploy order and revert as its reverse', () => {
    const auth = rebundlePlan(moduleDir).chunks.find(c => c.name === 'auth')!;
    expect(auth.verify).toEqual(auth.deploy);
    expect(auth.revert).toEqual([...auth.deploy].reverse());
  });

  it('derives chunk-level dependencies from cross-chunk change edges', () => {
    const billing = rebundlePlan(moduleDir).chunks.find(c => c.name === 'billing')!;
    // billing changes require auth/schema and auth/tables/users → depends on 'auth'
    expect(billing.dependencies).toEqual(['auth']);
  });

  it('collapses everything into one chunk with boundary "none"', () => {
    const result = rebundlePlan(moduleDir, { boundary: 'none' });
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].deploy).toEqual(CHANGES);
  });

  it('splits a boundary group when maxChunkSize is exceeded', () => {
    const result = rebundlePlan(moduleDir, { boundary: 'none', maxChunkSize: 2 });
    expect(result.chunks.map(c => c.deploy.length)).toEqual([2, 2, 1]);
    // Members remain in contiguous source order across the split.
    expect(result.chunks.flatMap(c => c.deploy)).toEqual(CHANGES);
  });

  it('groups changes by the classifier category with boundary "category"', () => {
    // Facts-driven seam: auth-* is security, billing-* is data. The chunk names
    // follow meaning, not the folder path ('auth'/'billing').
    const category: Record<string, string> = {
      'schemas/auth/schema': 'security',
      'schemas/auth/tables/users': 'security',
      'schemas/auth/tables/sessions': 'security',
      'schemas/billing/schema': 'data',
      'schemas/billing/tables/invoices': 'data',
    };
    const result = rebundlePlan(moduleDir, {
      boundary: 'category',
      categoryOf: name => category[name],
    });

    expect(result.deployOrder).toEqual(['security', 'data']);
    expect(result.chunks.find(c => c.name === 'security')!.deploy).toEqual([
      'schemas/auth/schema',
      'schemas/auth/tables/users',
      'schemas/auth/tables/sessions',
    ]);
    expect(result.chunks.find(c => c.name === 'data')!.dependencies).toEqual(['security']);
    // The carve is still byte-identical to the original module.
    expect(verifyRebundleInvariant(moduleDir, result).ok).toBe(true);
  });

  it('falls back to the folder key for changes categoryOf does not classify', () => {
    // Only classify the billing changes; the rest fall back to their folder key.
    const result = rebundlePlan(moduleDir, {
      boundary: 'category',
      categoryOf: name => (name.startsWith('schemas/billing/') ? 'billing-domain' : undefined),
    });

    expect(result.deployOrder).toEqual(['auth', 'billing-domain']);
    expect(verifyRebundleInvariant(moduleDir, result).ok).toBe(true);
  });

  it('keeps interleaved categories contiguous (suffixed) and byte-identical', () => {
    // A category that reappears non-contiguously must NOT merge across the gap —
    // that would reorder statements and break the invariant. Instead each run
    // seals into its own ordinal-suffixed chunk.
    const category: Record<string, string> = {
      'schemas/auth/schema': 'core',
      'schemas/auth/tables/users': 'aux',
      'schemas/auth/tables/sessions': 'core', // 'core' reappears after 'aux'
      'schemas/billing/schema': 'aux', // 'aux' reappears after the second 'core'
      'schemas/billing/tables/invoices': 'aux',
    };
    const result = rebundlePlan(moduleDir, {
      boundary: 'category',
      categoryOf: name => category[name],
    });

    // Non-contiguous reuse → suffixed runs, never a merge across the gap.
    expect(result.chunks.map(c => c.name)).toEqual(['core', 'aux', 'core~2', 'aux~2']);
    expect(result.chunks.flatMap(c => c.deploy)).toEqual(CHANGES);
    expect(verifyRebundleInvariant(moduleDir, result).ok).toBe(true);
  });
});

describe('assembleChunkSql', () => {
  it('concatenates member deploy files in deploy order', () => {
    const auth = rebundlePlan(moduleDir).chunks.find(c => c.name === 'auth')!;
    const sql = assembleChunkSql(moduleDir, auth, 'deploy');
    expect(sql.indexOf('schemas/auth/schema')).toBeLessThan(sql.indexOf('schemas/auth/tables/users'));
    expect(sql.indexOf('schemas/auth/tables/users')).toBeLessThan(sql.indexOf('schemas/auth/tables/sessions'));
  });

  it('concatenates member revert files in reverse order', () => {
    const auth = rebundlePlan(moduleDir).chunks.find(c => c.name === 'auth')!;
    const sql = assembleChunkSql(moduleDir, auth, 'revert');
    expect(sql.indexOf('schemas/auth/tables/sessions')).toBeLessThan(sql.indexOf('schemas/auth/schema'));
  });
});

describe('verifyRebundleInvariant', () => {
  it('reproduces the original resolved output byte-for-byte (folder boundary)', () => {
    const result = rebundlePlan(moduleDir);
    const check = verifyRebundleInvariant(moduleDir, result);
    expect(check).toEqual({ ok: true, mismatches: [] });
  });

  it('is byte-identical for the single-chunk dial position', () => {
    const result = rebundlePlan(moduleDir, { boundary: 'none' });
    expect(verifyRebundleInvariant(moduleDir, result).ok).toBe(true);
  });

  it('is byte-identical for the size-capped dial position', () => {
    const result = rebundlePlan(moduleDir, { boundary: 'none', maxChunkSize: 2 });
    expect(verifyRebundleInvariant(moduleDir, result).ok).toBe(true);
  });

  it('assembled deploy equals resolveWithPlan deploy', () => {
    const result = rebundlePlan(moduleDir);
    const assembled = result.chunks
      .map(c => assembleChunkSql(moduleDir, c, 'deploy'))
      .join('\n');
    expect(assembled).toEqual(resolveWithPlan(moduleDir, 'deploy'));
  });
});
