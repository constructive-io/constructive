import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import {
  readModule,
  serializePlan,
  serializeScript,
  verifyModuleRoundTrip,
  writeModule
} from '../../src/module';

let sourceDir: string;

const PLAN = `%syntax-version=1.0.0
%project=my-module
%uri=my-module

schemas/auth/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # add schema
schemas/auth/tables/users [schemas/auth/schema] 2024-01-01T00:00:01Z Dev <dev@example.com> # add users
schemas/billing/schema [schemas/auth/schema] 2024-01-01T00:00:02Z Dev <dev@example.com> # add billing
`;

const CONTROL = `# my-module extension
comment = 'my-module extension'
default_version = '0.0.1'
module_pathname = '$libdir/my-module'
requires = 'citext,plpgsql'
relocatable = false
superuser = false
`;

const DEPLOY: Record<string, string> = {
  'schemas/auth/schema': 'CREATE SCHEMA auth;',
  'schemas/auth/tables/users': 'CREATE TABLE auth.users (id int PRIMARY KEY);',
  'schemas/billing/schema': 'CREATE SCHEMA billing;'
};

function write(rel: string, content: string): void {
  const file = join(sourceDir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

beforeEach(() => {
  sourceDir = mkdtempSync(join(tmpdir(), 'pgpm-ast-src-'));
  writeFileSync(join(sourceDir, 'pgpm.plan'), PLAN);
  writeFileSync(join(sourceDir, 'my-module.control'), CONTROL);
  for (const [change, sql] of Object.entries(DEPLOY)) {
    write(`deploy/${change}.sql`, `-- Deploy ${change}\nBEGIN;\n${sql}\nCOMMIT;\n`);
    write(`revert/${change}.sql`, `-- Revert ${change}\nBEGIN;\nDROP THING;\nCOMMIT;\n`);
    // verify intentionally omitted for one change to exercise null scripts
    if (change !== 'schemas/billing/schema') {
      write(`verify/${change}.sql`, `-- Verify ${change}\nBEGIN;\nSELECT 1;\nROLLBACK;\n`);
    }
  }
});

afterEach(() => {
  rmSync(sourceDir, { recursive: true, force: true });
});

describe('readModule', () => {
  it('builds a plan-ordered module AST with parsed control + scripts', () => {
    const mod = readModule(sourceDir);

    expect(mod.name).toBe('my-module');
    expect(mod.dir).toBe(sourceDir);
    expect(mod.changes.map(c => c.name)).toEqual([
      'schemas/auth/schema',
      'schemas/auth/tables/users',
      'schemas/billing/schema'
    ]);

    expect(mod.control).not.toBeNull();
    expect(mod.control!.fileName).toBe('my-module.control');
    expect(mod.control!.version).toBe('0.0.1');
    expect(mod.control!.requires).toEqual(['citext', 'plpgsql']);
  });

  it('parses each change header and preserves dependencies', () => {
    const mod = readModule(sourceDir);
    const users = mod.changes.find(c => c.name === 'schemas/auth/tables/users')!;

    expect(users.plan.dependencies).toEqual(['schemas/auth/schema']);
    expect(users.deploy).not.toBeNull();
    expect(users.deploy!.header.verb).toBe('Deploy');
    expect(users.deploy!.header.change).toBe('schemas/auth/tables/users');
    expect(users.deploy!.body).toContain('CREATE TABLE auth.users');
  });

  it('marks a missing script as null', () => {
    const mod = readModule(sourceDir);
    const billing = mod.changes.find(c => c.name === 'schemas/billing/schema')!;
    expect(billing.deploy).not.toBeNull();
    expect(billing.verify).toBeNull();
  });

  it('throws when there is no pgpm.plan', () => {
    const empty = mkdtempSync(join(tmpdir(), 'pgpm-ast-empty-'));
    try {
      expect(() => readModule(empty)).toThrow(/No pgpm\.plan/);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe('writeModule (lossless copy)', () => {
  it('reproduces plan, control, and scripts byte-for-byte', () => {
    const mod = readModule(sourceDir);
    const outDir = mkdtempSync(join(tmpdir(), 'pgpm-ast-out-'));
    try {
      writeModule(mod, { outDir });

      expect(readFileSync(join(outDir, 'pgpm.plan'), 'utf-8')).toBe(PLAN);
      expect(readFileSync(join(outDir, 'my-module.control'), 'utf-8')).toBe(CONTROL);
      for (const [change, sql] of Object.entries(DEPLOY)) {
        expect(readFileSync(join(outDir, 'deploy', `${change}.sql`), 'utf-8')).toBe(
          `-- Deploy ${change}\nBEGIN;\n${sql}\nCOMMIT;\n`
        );
      }
      // omitted verify stays omitted
      const rereadMod = readModule(outDir);
      expect(rereadMod.changes.find(c => c.name === 'schemas/billing/schema')!.verify).toBeNull();
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe('serialize helpers', () => {
  it('serializeScript is byte-identical to source header+body', () => {
    const mod = readModule(sourceDir);
    for (const change of mod.changes) {
      for (const script of [change.deploy, change.revert, change.verify]) {
        if (!script) continue;
        expect(serializeScript(script)).toBe(script.raw);
      }
    }
  });

  it('serializePlan round-trips the plan structurally', () => {
    const mod = readModule(sourceDir);
    const once = serializePlan(mod);
    // re-parsing the serialized plan and serializing again is stable
    const outDir = mkdtempSync(join(tmpdir(), 'pgpm-ast-plan-'));
    try {
      writeModule(mod, { outDir, fromRaw: false });
      expect(serializePlan(readModule(outDir))).toBe(once);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe('verifyModuleRoundTrip', () => {
  it('reports no drift for a well-formed module', () => {
    expect(verifyModuleRoundTrip(sourceDir)).toEqual([]);
  });
});
