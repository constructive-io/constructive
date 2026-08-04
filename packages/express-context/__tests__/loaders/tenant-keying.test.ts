/**
 * The invariant behind constructive-planning#1403: every discovery query a
 * loader runs against a *tenant* database must be keyed by that tenant.
 *
 * One serving database holds several tenants' schemas in the normal
 * schema-per-tenant topology, so an unkeyed `metaschema_modules_public` lookup
 * does not fail — it returns a neighbouring tenant's row, and the loader cache
 * then serves that wrong answer for its whole TTL. That is a cross-tenant
 * config read with no symptom, which is why it is asserted structurally here
 * rather than left to a test of any one loader.
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const LOADERS_DIR = join(__dirname, '..', '..', 'src', 'loaders');

/** Loader sources — the plumbing files carry no SQL. */
const INFRASTRUCTURE = new Set(['create-loader.ts', 'index.ts', 'registry.ts', 'types.ts']);

const loaderSources = readdirSync(LOADERS_DIR)
  .filter(f => f.endsWith('.ts') && !INFRASTRUCTURE.has(f))
  .map(file => ({ file, src: readFileSync(join(LOADERS_DIR, file), 'utf8') }));

/**
 * Every `SELECT ... FROM metaschema_modules_public.<module> ...` in the source,
 * sliced from FROM to the end of the template literal it lives in.
 */
const moduleQueries = ({ file, src }: { file: string; src: string }) => {
  const matches = [...src.matchAll(/FROM\s+metaschema_modules_public\.(\w+)([\s\S]*?)`/g)];
  return matches.map(m => ({ file, module: m[1], body: m[2] }));
};

describe('tenant-DB discovery is keyed by database_id', () => {
  it('finds the module discovery queries it is meant to be checking', () => {
    // A regex that silently matches nothing would make every assertion below
    // vacuously true — including for a loader added later.
    const all = loaderSources.flatMap(moduleQueries);
    expect(all.length).toBeGreaterThanOrEqual(6);
    expect(new Set(all.map(q => q.module))).toContain('sessions_module');
  });

  it.each(loaderSources.flatMap(moduleQueries))(
    '$file: $module is filtered by database_id',
    ({ body }) => {
      expect(body).toMatch(/WHERE[\s\S]*\bdatabase_id\s*=\s*\$1/);
    }
  );

  it('binds a parameter to every parameterised discovery query', () => {
    for (const { file, src } of loaderSources) {
      if (!/\$1/.test(src)) continue;
      // `$1` in the SQL with no second argument at the call site is a runtime
      // error, not a type error — pg accepts `query(text)` happily.
      expect({ file, passesParams: /query<[^>]*>\([\s\S]*?,\s*\[/.test(src) }).toEqual({
        file,
        passesParams: true
      });
    }
  });
});
