import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadConfig } from '../src/config/loader';
import { PRESETS } from '../src/config/presets';
import { toJsonSchema } from '../src/config/schema';
import { validateConfigShape } from '../src/config/validate';

const SCHEMA_FILE = path.join(__dirname, '..', 'schema', 'safegres.schema.json');

function load(config: unknown): ReturnType<typeof loadConfig> {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'safegres-schema-'));
  fs.writeFileSync(path.join(cwd, '.safegresrc.json'), JSON.stringify(config));
  return loadConfig({ cwd });
}

describe('config shape', () => {
  it('rejects a typo\u2019d key and names the one it means', () => {
    expect(() => load({ failon: { grade: 'B' } })).toThrow(/unknown key "failon" — did you mean "failOn"\?/);
    expect(() => load({ outputs: { sarrif: 'out.sarif' } })).toThrow(
      /unknown key "outputs.sarrif" — did you mean "sarif"\?/
    );
  });

  it('rejects a value of the wrong kind, and an unknown enum member', () => {
    expect(() => load({ perf: { enabled: 'yes' } })).toThrow(/"perf.enabled" is a string; expected a boolean/);
    expect(() => load({ report: { github: { annotations: 'some' } } })).toThrow(
      /"report.github.annotations" is "some"; expected one of "all", "gate-failures", "none"/
    );
  });

  it('accepts $schema, so a file can point an editor at the schema', () => {
    expect(() => load({ $schema: '../schema/safegres.schema.json', failOn: { grade: 'B' } })).not.toThrow();
  });

  it('accepts every shipped preset', () => {
    for (const [name, preset] of Object.entries(PRESETS)) {
      expect(() => validateConfigShape(preset)).not.toThrow(new RegExp(name));
      validateConfigShape(preset);
    }
  });

  it('accepts a full config using every top-level key', () => {
    expect(() =>
      validateConfigShape({
        extends: ['safegres:supabase', 'safegres:multi-tenant'],
        exposure: {
          schemas: ['app_public'],
          roles: ['anon'],
          planes: [{ name: 'direct:app', kind: 'role', roles: ['app'] }]
        },
        public: { read: ['app_public.plans*'] },
        extensions: { skipOwned: false, ignore: ['pg_partman'] },
        perf: {
          enabled: true,
          rules: { X1: 'off' },
          ignore: ['app_public.audit_*'],
          scoring: { densityK: 0.2, includeStats: false },
          stats: { enabled: true, minRows: 10 },
          explain: { enabled: true },
          baseline: 'ci/perf.json',
          failOnNew: true,
          paths: { infer: true, onWriteOncePointer: 'demote' }
        },
        schemas: ['app_public'],
        excludeSchemas: ['audit'],
        roles: ['anon'],
        excludeRoles: ['postgres'],
        rules: { 'A*': 'info', A3: ['high', { rolesFrom: 'anon' }] },
        overrides: [{ tables: ['app_public.audit_*'], rules: { A2: 'off' } }],
        scoring: { model: 'density', unknownExposureCap: false, floorOnCritical: 'C' },
        failOn: { grade: 'B', planes: { 'direct:app': { grade: 'D' } } },
        source: { pgpm: 'application/app' },
        outputs: { dir: 'safegres-reports' },
        callGraph: { enabled: true, baseline: 'ci/boundaries.json' },
        report: { dimensions: ['security', 'perf'], github: { detail: 'summary', badges: false } },
        eval: { corpus: 'corpus', preset: 'recommended', cases: ['01'] }
      })
    ).not.toThrow();
  });
});

describe('schema/safegres.schema.json', () => {
  it('is the described shape \u2014 regenerate with `node scripts/write-schema.js` after a build', () => {
    const committed = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));
    expect(committed).toEqual(toJsonSchema());
  });
});
