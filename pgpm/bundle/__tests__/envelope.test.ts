import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import {
  BundleEnvelope,
  bundleFromModule,
  createEnvelope,
  envelopeFromDirectory,
  materializeEnvelope,
  MigrationBundle,
  readEnvelopeFile,
  verifyEnvelope,
  writeEnvelopeFile
} from '../src';

let sourceDir: string;
let outDir: string;

const PLAN = `%syntax-version=1.0.0
%project=my-module
%uri=my-module

schemas/auth/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # add schema
schemas/auth/tables/users [schemas/auth/schema] 2024-01-01T00:00:01Z Dev <dev@example.com> # add users
`;

const DEPLOY: Record<string, string> = {
  'schemas/auth/schema': 'CREATE SCHEMA auth;',
  'schemas/auth/tables/users': 'CREATE TABLE auth.users (id int PRIMARY KEY);'
};

const DATA_PART = {
  name: 'source-plane-data',
  deploy: "INSERT INTO auth.users (id) VALUES (1);\n",
  revert: 'DELETE FROM auth.users WHERE id IN (1);\n',
  verify: 'SELECT 1/(count(*) = 1)::int FROM auth.users;\n'
};

const FIXTURE_PART = {
  name: 'seed-roles',
  deploy: "INSERT INTO auth.users (id) VALUES (99);\n"
};

function write(rel: string, content: string): void {
  const file = join(sourceDir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function makeSchema(): MigrationBundle {
  return bundleFromModule(sourceDir);
}

function makeEnvelope(): BundleEnvelope {
  return createEnvelope({
    version: '1.0.0',
    schema: makeSchema(),
    data: [DATA_PART],
    fixtures: [FIXTURE_PART],
    provenance: { sourceDatabase: 'db-123', sliceSpec: 'tier:auth' }
  });
}

beforeEach(() => {
  sourceDir = mkdtempSync(join(tmpdir(), 'pgpm-envelope-src-'));
  outDir = mkdtempSync(join(tmpdir(), 'pgpm-envelope-out-'));
  writeFileSync(join(sourceDir, 'pgpm.plan'), PLAN);
  for (const [name, sql] of Object.entries(DEPLOY)) {
    write(join('deploy', `${name}.sql`), `-- Deploy my-module:${name} to pg\n${sql}\n`);
    write(join('revert', `${name}.sql`), `-- Revert my-module:${name} from pg\n-- noop\n`);
    write(join('verify', `${name}.sql`), `-- Verify my-module:${name} on pg\nSELECT 1;\n`);
  }
});

afterEach(() => {
  rmSync(sourceDir, { recursive: true, force: true });
  rmSync(outDir, { recursive: true, force: true });
});

describe('createEnvelope', () => {
  it('builds a deterministic, content-addressed envelope', () => {
    const envelope = makeEnvelope();

    expect(envelope.manifest.formatVersion).toBe('1');
    expect(envelope.manifest.name).toBe('my-module');
    expect(envelope.manifest.version).toBe('1.0.0');
    expect(envelope.manifest.parts.map(p => `${p.kind}:${p.name}`)).toEqual([
      'schema:my-module',
      'data:source-plane-data',
      'fixtures:seed-roles'
    ]);
    // schema part digest is the bundle's own digest (Merkle chain extends down)
    expect(envelope.manifest.parts[0].digest).toBe(envelope.schema.manifest.digest);
    expect(envelope.manifest.provenance).toEqual({
      sourceDatabase: 'db-123',
      sliceSpec: 'tier:auth'
    });

    // deterministic: same inputs, same digest; provenance does not perturb it
    const again = createEnvelope({
      version: '1.0.0',
      schema: makeSchema(),
      data: [DATA_PART],
      fixtures: [FIXTURE_PART]
    });
    expect(again.manifest.digest).toBe(envelope.manifest.digest);

    // any content change changes the digest
    const changed = createEnvelope({
      version: '1.0.0',
      schema: makeSchema(),
      data: [{ ...DATA_PART, deploy: DATA_PART.deploy + '-- extra\n' }],
      fixtures: [FIXTURE_PART]
    });
    expect(changed.manifest.digest).not.toBe(envelope.manifest.digest);

    // version participates in identity
    const v2 = createEnvelope({ version: '2.0.0', schema: makeSchema(), data: [DATA_PART] });
    expect(v2.manifest.digest).not.toBe(envelope.manifest.digest);
  });
});

describe('verifyEnvelope', () => {
  it('passes a pristine envelope, including the schema bundle chain', () => {
    const { issues, schemaIssues } = verifyEnvelope(makeEnvelope());
    expect(issues).toEqual([]);
    expect(schemaIssues).toEqual([]);
  });

  it('detects tampered part SQL, inventory drift, and schema tampering', () => {
    const tamperedPart = makeEnvelope();
    tamperedPart.data[0].deploy += '-- tampered\n';
    const r1 = verifyEnvelope(tamperedPart);
    expect(r1.issues.map(i => i.kind)).toEqual(
      expect.arrayContaining(['part-digest', 'part-inventory', 'envelope-digest'])
    );

    const droppedPart = makeEnvelope();
    droppedPart.fixtures = [];
    const r2 = verifyEnvelope(droppedPart);
    expect(r2.issues.map(i => i.kind)).toEqual(
      expect.arrayContaining(['part-inventory', 'envelope-digest'])
    );

    const tamperedSchema = makeEnvelope();
    tamperedSchema.schema.changes[0].deploy!.sql += '-- tampered\n';
    const r3 = verifyEnvelope(tamperedSchema);
    expect(r3.issues.map(i => i.kind)).toContain('schema-bundle');
    expect(r3.schemaIssues.length).toBeGreaterThan(0);
  });
});

describe('serialization', () => {
  it('round-trips through the single JSON artifact', () => {
    const envelope = makeEnvelope();
    const file = join(outDir, 'pgpm-envelope.json');
    writeEnvelopeFile(envelope, file);
    const read = readEnvelopeFile(file);
    expect(read).toEqual(envelope);
    expect(verifyEnvelope(read).issues).toEqual([]);
  });

  it('round-trips through the materialized directory layout', () => {
    const envelope = makeEnvelope();
    materializeEnvelope(envelope, outDir);

    const read = envelopeFromDirectory(outDir);
    expect(read.manifest).toEqual(envelope.manifest);
    expect(read.schema).toEqual(envelope.schema);
    expect(read.data).toEqual(envelope.data);
    expect(read.fixtures).toEqual(envelope.fixtures);
    expect(verifyEnvelope(read).issues).toEqual([]);

    // optional scripts absent on disk stay null
    expect(read.fixtures[0].revert).toBeNull();
    expect(read.fixtures[0].verify).toBeNull();
  });

  it('directory verify catches on-disk tampering', () => {
    materializeEnvelope(makeEnvelope(), outDir);
    writeFileSync(
      join(outDir, 'data', 'source-plane-data', 'deploy.sql'),
      '-- swapped\n'
    );
    const read = envelopeFromDirectory(outDir);
    const { issues } = verifyEnvelope(read);
    expect(issues.map(i => i.kind)).toEqual(
      expect.arrayContaining(['part-inventory', 'envelope-digest'])
    );
  });
});
