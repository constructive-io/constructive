import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { deparseModule, parseModule, readModule } from '../../src/ast';

let sourceDir: string;

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

function write(rel: string, content: string): void {
  const file = join(sourceDir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

beforeEach(() => {
  sourceDir = mkdtempSync(join(tmpdir(), 'pgpm-parse-src-'));
  writeFileSync(join(sourceDir, 'pgpm.plan'), PLAN);
  for (const [change, sql] of Object.entries(DEPLOY)) {
    write(`deploy/${change}.sql`, `-- Deploy ${change}\nBEGIN;\n${sql}\nCOMMIT;\n`);
    write(`revert/${change}.sql`, `-- Revert ${change}\nBEGIN;\nDROP THING;\nCOMMIT;\n`);
  }
});

afterEach(() => rmSync(sourceDir, { recursive: true, force: true }));

describe('parseModule / deparseModule', () => {
  it('parseModule is readModule', () => {
    expect(parseModule(sourceDir)).toEqual(readModule(sourceDir));
  });

  it('parse → deparse round-trips a module byte-for-byte', () => {
    const mod = parseModule(sourceDir);
    const outDir = mkdtempSync(join(tmpdir(), 'pgpm-parse-out-'));
    try {
      deparseModule(mod, { outDir });
      expect(readFileSync(join(outDir, 'pgpm.plan'), 'utf-8')).toBe(PLAN);
      for (const change of Object.keys(DEPLOY)) {
        expect(readFileSync(join(outDir, 'deploy', `${change}.sql`), 'utf-8')).toBe(
          `-- Deploy ${change}\nBEGIN;\n${DEPLOY[change]}\nCOMMIT;\n`
        );
      }
      // re-parsing the deparsed module yields an equal AST (modulo dir)
      expect(parseModule(outDir).changes).toEqual(mod.changes);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
