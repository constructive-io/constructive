// End-to-end example: pgpm PROJECTIONS.
//
// One SQL schema (schema/schema.sql) is the source of truth. We normalize it
// to an identity-keyed object set and then *project* it into many shapes:
//
//   granularity          atomic | object | consolidated  (statement shape)
//   change granularity   alteration | object | single    (plan-entry shape)
//   partition            one module vs app + security modules
//   diff                 schema.sql -> schema-v2.sql as a generated migration
//   output               pgpm module | linear .sql
//
// The headline guarantee: a projection changes the *representation*, never the
// *meaning*. We prove it WITHOUT a database by normalizing each projection back
// to its object set and asserting the diff is empty — authoring granularity,
// change granularity, naming, partitioning, ordering, and whitespace all wash
// out.
//
// (Deploy-level catalog equivalence for every projection is also proven
// against live Postgres by the engine's own suites — pgpm/cli transform-e2e
// "dial parity" and diff-e2e. See README.)
//
// This suite is intentionally database-free: it only runs the CLI and compares
// the emitted artifacts semantically.
import { loadDiffSideFromDisk } from '@pgpmjs/diff';
import { diffChangeSets, loadModule } from '@pgpmjs/transform';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const CLI = path.join(__dirname, '..', '..', '..', 'pgpm', 'cli', 'dist', 'index.js');
const SCHEMA_DIR = path.join(__dirname, '..', 'schema');

const pgpm = (work: string, args: string[]): void => {
  execFileSync('node', [CLI, ...args], { cwd: work, stdio: 'pipe' });
};

type ChangeSet = ReturnType<typeof loadDiffSideFromDisk>['changes'];
const changesOf = (dir: string): ChangeSet => loadDiffSideFromDisk(dir).changes;

describe('pgpm projections: one schema, every shape, one meaning', () => {
  let work: string;

  beforeAll(async () => {
    await loadModule();
    work = fs.mkdtempSync(path.join(os.tmpdir(), 'pgpm-projections-'));

    // Source schema -> pgpm module at the default (object) granularity.
    pgpm(work, ['import', path.join(SCHEMA_DIR, 'schema.sql'), '--pkg', 'blog', '--out', work]);

    // Re-dial the same module to other granularities (siblings blog-<gran>).
    pgpm(work, ['transform', '--granularity', 'atomic', '--cwd', path.join(work, 'blog')]);
    pgpm(work, ['transform', '--granularity', 'consolidated', '--cwd', path.join(work, 'blog')]);

    // The fourth dial: one change per alteration (per column / per constraint),
    // or the whole module as one big change.
    pgpm(work, [
      'transform', '--granularity', 'atomic', '--change-granularity', 'alteration',
      '--cwd', path.join(work, 'blog'), '--out', path.join(work, 'alteration')
    ]);
    pgpm(work, [
      'transform', '--granularity', 'consolidated', '--change-granularity', 'single',
      '--cwd', path.join(work, 'blog'), '--out', path.join(work, 'single')
    ]);

    // Partition the same source into app + security modules.
    pgpm(work, [
      'import', path.join(SCHEMA_DIR, 'schema.sql'),
      '--pkg', 'blog-part',
      '--partition', path.join(SCHEMA_DIR, 'partition.json'),
      '--out', work
    ]);

    // The next schema version, and the generated migration between them.
    pgpm(work, ['import', path.join(SCHEMA_DIR, 'schema-v2.sql'), '--pkg', 'blog-v2', '--out', work]);
    pgpm(work, [
      'diff', path.join(work, 'blog'), path.join(work, 'blog-v2'),
      '--emit-migration', work, '--pkg', 'blog-migration',
      '--emit-sql', path.join(work, 'migration.sql')
    ]);
  });

  afterAll(() => {
    fs.rmSync(work, { recursive: true, force: true });
  });

  it('imports the schema into a deployable pgpm module', () => {
    const moduleDir = path.join(work, 'blog');
    expect(fs.existsSync(path.join(moduleDir, 'pgpm.plan'))).toBe(true);
    expect(fs.existsSync(path.join(moduleDir, 'blog.control'))).toBe(true);
    expect(changesOf(moduleDir).length).toBeGreaterThan(0);
  });

  it('is granularity-invariant: object and consolidated normalize to the same schema', () => {
    const object = changesOf(path.join(work, 'blog'));
    const consolidated = changesOf(path.join(work, 'blog-consolidated'));
    expect(diffChangeSets(object, consolidated).identical).toBe(true);
  });

  it('is partition-invariant: app + security modules recombine to the same schema', () => {
    const object = changesOf(path.join(work, 'blog'));
    const partitioned = [
      ...changesOf(path.join(work, 'blog-core')),
      ...changesOf(path.join(work, 'blog-security'))
    ];
    expect(diffChangeSets(object, partitioned).identical).toBe(true);
  });

  it('is granularity-invariant: atomic normalizes to the same schema too', () => {
    // atomic explodes objects into per-column / per-constraint statements, yet
    // constraint-placement normalization folds them back — full semantic
    // identity, not just catalog equivalence.
    const object = changesOf(path.join(work, 'blog'));
    const atomic = changesOf(path.join(work, 'blog-atomic'));
    expect(diffChangeSets(object, atomic).identical).toBe(true);
  });

  it('is change-granularity-invariant: one change per alteration, same schema', () => {
    const alterationDir = path.join(work, 'alteration', 'blog-atomic');
    const plan = fs.readFileSync(path.join(alterationDir, 'pgpm.plan'), 'utf-8');
    // every column and constraint is its own plan entry...
    expect(plan).toMatch(/\/columns\/[a-z_]+\/column/);
    expect(plan).toMatch(/\/constraints\/[a-z_]+\/constraint/);
    // ...and the meaning is untouched.
    const object = changesOf(path.join(work, 'blog'));
    const alteration = changesOf(alterationDir);
    expect(diffChangeSets(object, alteration).identical).toBe(true);
  });

  it('is change-granularity-invariant: one big change, same schema', () => {
    const singleDir = path.join(work, 'single', 'blog-consolidated');
    const plan = fs.readFileSync(path.join(singleDir, 'pgpm.plan'), 'utf-8');
    const entries = plan.split('\n').filter(l => l.trim() && !l.startsWith('%') && !l.startsWith('#'));
    // the whole module is one plan entry...
    expect(entries).toHaveLength(1);
    // ...and the meaning is untouched.
    const object = changesOf(path.join(work, 'blog'));
    const single = changesOf(singleDir);
    expect(diffChangeSets(object, single).identical).toBe(true);
  });

  it('derives the v1 -> v2 migration: exactly the real changes, nothing guessed', () => {
    const result = diffChangeSets(
      changesOf(path.join(work, 'blog')),
      changesOf(path.join(work, 'blog-v2'))
    );
    expect(result.identical).toBe(false);
    const byDelta = (delta: string): string[] =>
      result.objects.filter(o => o.delta === delta).map(o => o.path).sort();

    // two new tables, one new policy
    expect(byDelta('added')).toEqual([
      'schemas/blog_app/tables/post_tags/table',
      'schemas/blog_app/tables/tags/table',
      'schemas/blog_sec/tables/audit_log/policies/audit_log_insert/policy'
    ]);
    // changed posts table + changed function body
    expect(byDelta('modified')).toEqual([
      'schemas/blog_app/procedures/published_post_count/procedure',
      'schemas/blog_app/tables/posts/table'
    ]);
    expect(byDelta('removed')).toEqual([]);
  });

  it('projects the migration into a pgpm module AND a linear SQL file at once', () => {
    // module projection
    expect(fs.existsSync(path.join(work, 'blog-migration', 'pgpm.plan'))).toBe(true);

    // linear SQL projection: statements in dependency order, no CREATE OR REPLACE
    const sql = fs.readFileSync(path.join(work, 'migration.sql'), 'utf-8');
    expect(sql).toMatch(/CREATE TABLE blog_app\.tags/);
    expect(sql).toMatch(/CREATE TABLE blog_app\.post_tags/);
    expect(sql).toMatch(/ADD COLUMN slug/);
    expect(sql).toMatch(/DROP COLUMN word_count/);
    expect(sql).toMatch(/DROP FUNCTION blog_app\.published_post_count/);
    expect(sql).toMatch(/CREATE POLICY audit_log_insert/);
    expect(sql).not.toMatch(/CREATE OR REPLACE/i);
  });
});
