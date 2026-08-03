import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { loadWorkspaceModuleSources } from '../../src/diff/sides';

/**
 * A workspace with two modules where the downstream module depends on an
 * upstream module's *tag* (`base:@v1`). The workspace loader has every plan in
 * context, so the cross-package tag must resolve to the canonical
 * `base:<change>` qualified name — the same form the deploy-time resolver
 * emits — instead of being passed through verbatim.
 */
describe('loadWorkspaceModuleSources cross-package tag resolution', () => {
  let ws: string;

  beforeEach(() => {
    ws = mkdtempSync(join(tmpdir(), 'pgpm-xpkg-'));
  });

  afterEach(() => {
    rmSync(ws, { recursive: true, force: true });
  });

  const writeModule = (
    name: string,
    plan: string[],
    scripts: Record<string, string>
  ) => {
    const dir = join(ws, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'pgpm.plan'),
      ['%syntax-version=1.0.0', `%project=${name}`, `%uri=${name}`, '', ...plan, ''].join('\n')
    );
    writeFileSync(
      join(dir, `${name}.control`),
      `default_version = '0.0.1'\ncomment = '${name}'\n`
    );
    for (const [change, sql] of Object.entries(scripts)) {
      const file = join(dir, 'deploy', `${change}.sql`);
      mkdirSync(join(file, '..'), { recursive: true });
      writeFileSync(file, sql);
    }
  };

  it('resolves a `base:@tag` dependency to `base:<change>`', async () => {
    writeFileSync(join(ws, 'pgpm.json'), JSON.stringify({ packages: ['*'] }, null, 2));

    writeModule(
      'base',
      [
        'schemas/base/schema 2017-08-11T08:11:51Z t <t@x> # schema',
        '@v1 schemas/base/schema 2017-08-11T08:11:51Z t <t@x> # release v1'
      ],
      { 'schemas/base/schema': '-- Deploy base schema\nCREATE SCHEMA base;\n' }
    );

    writeModule(
      'app',
      ['schemas/app/schema [base:@v1] 2017-08-11T08:11:51Z t <t@x> # schema'],
      { 'schemas/app/schema': '-- Deploy app schema\nCREATE SCHEMA app;\n' }
    );
    // app requires base
    writeFileSync(
      join(ws, 'app', 'app.control'),
      "default_version = '0.0.1'\ncomment = 'app'\nrequires = 'base'\n"
    );

    const { modules, warnings } = await loadWorkspaceModuleSources(ws);
    const app = modules.find(m => m.name === 'app')!;
    const change = app.changes.find(c => c.name === 'schemas/app/schema')!;

    expect(change.dependencies).toEqual(['base:schemas/base/schema']);
    expect(warnings.filter(w => w.includes('cross-package'))).toEqual([]);
  });
});
