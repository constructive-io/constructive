import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  parsePgpmHeader,
  renameInHeader,
  scanDeployScript,
  verifyPlanMatchesHeaders,
  writePgpmScript
} from '@pgpmjs/ast/files/sql/header';

const LEGACY = `-- Deploy my-module:tables/users to pg
-- requires: schema
-- requires: other-pkg:tables/accounts

BEGIN;
CREATE TABLE app.users (id serial primary key);
COMMIT;
`;

const MODERN = `-- Deploy tables/users
-- requires: schema

CREATE TABLE app.users (id serial primary key);
`;

const WRITER_COLON = `-- Deploy: tables/users
-- made with <3 @ constructive.io

-- requires: schema

CREATE TABLE app.users (id serial primary key);
`;

describe('parsePgpmHeader', () => {
  it('parses the legacy sqitch-compatible format', () => {
    const { header, body } = parsePgpmHeader(LEGACY);
    expect(header.verb).toBe('Deploy');
    expect(header.project).toBe('my-module');
    expect(header.change).toBe('tables/users');
    expect(header.toPg).toBe(true);
    expect(header.requires.map(r => r.raw)).toEqual(['schema', 'other-pkg:tables/accounts']);
    expect(header.requires[1].ref?.package).toBe('other-pkg');
    expect(body).toContain('CREATE TABLE app.users');
  });

  it('parses the modern format without project or to pg', () => {
    const { header } = parsePgpmHeader(MODERN);
    expect(header.verb).toBe('Deploy');
    expect(header.project).toBeNull();
    expect(header.change).toBe('tables/users');
    expect(header.toPg).toBe(false);
    expect(header.requires.map(r => r.raw)).toEqual(['schema']);
  });

  it('parses the writer colon format with interleaved comments', () => {
    const { header } = parsePgpmHeader(WRITER_COLON);
    expect(header.change).toBe('tables/users');
    expect(header.requires.map(r => r.raw)).toEqual(['schema']);
  });

  it('parses Revert and Verify headers', () => {
    expect(parsePgpmHeader('-- Revert my-module:schema to pg\n\nDROP SCHEMA app;\n').header.verb).toBe('Revert');
    expect(parsePgpmHeader('-- Verify my-module:schema to pg\n\nSELECT 1;\n').header.verb).toBe('Verify');
  });

  it('parses tag references in requires', () => {
    const { header } = parsePgpmHeader('-- Deploy x\n-- requires: pkg:@v1\n\nSELECT 1;\n');
    expect(header.requires[0].raw).toBe('pkg:@v1');
    expect(header.requires[0].ref?.package).toBe('pkg');
    expect(header.requires[0].ref?.tag).toBe('v1');
  });

  it('round-trips content byte-exactly', () => {
    for (const content of [LEGACY, MODERN, WRITER_COLON, 'SELECT 1;\n', '']) {
      expect(writePgpmScript(parsePgpmHeader(content))).toBe(content);
    }
  });
});

describe('renameInHeader', () => {
  it('rewrites the header identity and matching requires', () => {
    const script = parsePgpmHeader(LEGACY);
    const count = renameInHeader(script, new Map([
      ['tables/users', 'tables/app_users'],
      ['schema', 'app_schema']
    ]));
    expect(count).toBe(2);
    expect(script.header.change).toBe('tables/app_users');
    const out = writePgpmScript(script);
    expect(out).toContain('-- Deploy my-module:tables/app_users to pg');
    expect(out).toContain('-- requires: app_schema');
    expect(out).toContain('-- requires: other-pkg:tables/accounts');
    expect(out).toContain('CREATE TABLE app.users');
  });

  it('rewrites package-qualified requires but leaves tag refs untouched', () => {
    const script = parsePgpmHeader('-- Deploy x\n-- requires: pkg:tables/users\n-- requires: pkg:@v1\n\nSELECT 1;\n');
    const count = renameInHeader(script, new Map([['tables/users', 'tables/app_users']]));
    expect(count).toBe(1);
    const out = writePgpmScript(script);
    expect(out).toContain('-- requires: pkg:tables/app_users');
    expect(out).toContain('-- requires: pkg:@v1');
  });

  it('is a no-op when nothing matches', () => {
    const script = parsePgpmHeader(MODERN);
    expect(renameInHeader(script, new Map([['nope', 'nada']]))).toBe(0);
    expect(writePgpmScript(script)).toBe(MODERN);
  });
});

describe('scanDeployScript', () => {
  const makeKey = (change: string) => `/deploy/${change}.sql`;

  it('collects requires lines verbatim', () => {
    const { requires } = scanDeployScript(LEGACY, {
      key: '/deploy/tables/users.sql',
      extname: 'my-module',
      makeKey
    });
    expect(requires).toEqual(['schema', 'other-pkg:tables/accounts']);
  });

  it('throws on project mismatch', () => {
    expect(() =>
      scanDeployScript(LEGACY, { key: '/deploy/tables/users.sql', extname: 'other', makeKey })
    ).toThrow(/Mismatched project name/);
  });

  it('throws on path identity mismatch', () => {
    expect(() =>
      scanDeployScript(LEGACY, { key: '/deploy/tables/accounts.sql', extname: 'my-module', makeKey })
    ).toThrow(/path or internal name mismatch/);
    expect(() =>
      scanDeployScript(MODERN, { key: '/deploy/tables/accounts.sql', extname: 'my-module', makeKey })
    ).toThrow(/wrong place or is named wrong/);
  });
});

describe('verifyPlanMatchesHeaders', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pgpm-header-'));
    mkdirSync(join(dir, 'deploy', 'tables'), { recursive: true });
    writeFileSync(join(dir, 'pgpm.plan'), `%syntax-version=1.0.0
%project=my-module
%uri=my-module

schema 2024-01-01T00:00:00Z Test <t@e.com> # schema
tables/users [schema] 2024-01-02T00:00:00Z Test <t@e.com> # users
`);
    writeFileSync(join(dir, 'deploy', 'schema.sql'), '-- Deploy my-module:schema to pg\n\nCREATE SCHEMA app;\n');
    writeFileSync(join(dir, 'deploy', 'tables', 'users.sql'), LEGACY.replace('-- requires: other-pkg:tables/accounts\n', ''));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports no issues for a consistent module', () => {
    expect(verifyPlanMatchesHeaders(dir)).toEqual([]);
  });

  it('reports missing deploy files', () => {
    rmSync(join(dir, 'deploy', 'tables', 'users.sql'));
    const issues = verifyPlanMatchesHeaders(dir);
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe('missing-file');
  });

  it('reports identity mismatches', () => {
    writeFileSync(join(dir, 'deploy', 'tables', 'users.sql'), '-- Deploy my-module:tables/accounts to pg\n-- requires: schema\n\nSELECT 1;\n');
    const issues = verifyPlanMatchesHeaders(dir);
    expect(issues.map(i => i.kind)).toContain('identity-mismatch');
  });

  it('reports requires drift between plan and headers', () => {
    writeFileSync(join(dir, 'deploy', 'tables', 'users.sql'), '-- Deploy my-module:tables/users to pg\n\nSELECT 1;\n');
    const issues = verifyPlanMatchesHeaders(dir);
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe('requires-drift');
    expect(issues[0].message).toContain('schema');
  });
});
