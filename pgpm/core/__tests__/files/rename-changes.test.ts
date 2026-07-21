import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import {
  deriveRenamesFromSchemaMapping,
  renameChanges,
  renameInPlanContent,
  validateRenames
} from '../../src/refactor/rename';

let moduleDir: string;

const PLAN = `%syntax-version=1.0.0
%project=my-module
%uri=my-module

schemas/my-app/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # add schema
schemas/my-app/tables/users [schemas/my-app/schema] 2024-01-01T00:00:01Z Dev <dev@example.com> # add users
schemas/my-app/tables/posts [schemas/my-app/schema schemas/my-app/tables/users] 2024-01-01T00:00:02Z Dev <dev@example.com> # add posts
schemas/other/functions/fn [schemas/my-app/tables/users auth:schemas/auth/tables/users] 2024-01-01T00:00:03Z Dev <dev@example.com> # fn
@v1.0.0 2024-01-01T00:00:04Z Dev <dev@example.com> # release
`;

function writeScript(rel: string, content: string): void {
  const file = join(moduleDir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

beforeEach(() => {
  moduleDir = mkdtempSync(join(tmpdir(), 'pgpm-rename-'));
  writeFileSync(join(moduleDir, 'pgpm.plan'), PLAN);

  writeScript('deploy/schemas/my-app/schema.sql', `-- Deploy schemas/my-app/schema

CREATE SCHEMA "my-app";
`);
  writeScript('deploy/schemas/my-app/tables/users.sql', `-- Deploy my-module:schemas/my-app/tables/users to pg
-- requires: schemas/my-app/schema

CREATE TABLE "my-app".users (id int);
`);
  writeScript('deploy/schemas/my-app/tables/posts.sql', `-- Deploy schemas/my-app/tables/posts
-- requires: schemas/my-app/schema
-- requires: schemas/my-app/tables/users

CREATE TABLE "my-app".posts (id int);
`);
  writeScript('deploy/schemas/other/functions/fn.sql', `-- Deploy schemas/other/functions/fn
-- requires: schemas/my-app/tables/users
-- requires: auth:schemas/auth/tables/users

CREATE FUNCTION other.fn() RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;
`);
  writeScript('revert/schemas/my-app/tables/users.sql', `-- Revert schemas/my-app/tables/users

DROP TABLE "my-app".users;
`);
  writeScript('verify/schemas/my-app/tables/users.sql', `-- Verify schemas/my-app/tables/users

SELECT 1;
`);
});

afterEach(() => {
  rmSync(moduleDir, { recursive: true, force: true });
});

describe('validateRenames', () => {
  it('rejects unknown source changes', () => {
    expect(() => validateRenames(moduleDir, new Map([['nope', 'x']]))).toThrow(/unknown change/);
  });

  it('rejects targets colliding with existing changes', () => {
    expect(() =>
      validateRenames(moduleDir, new Map([['schemas/my-app/schema', 'schemas/my-app/tables/users']]))
    ).toThrow(/already exists/);
  });

  it('rejects duplicate targets and self renames', () => {
    expect(() =>
      validateRenames(
        moduleDir,
        new Map([
          ['schemas/my-app/schema', 'x'],
          ['schemas/my-app/tables/users', 'x']
        ])
      )
    ).toThrow(/same target/);
    expect(() =>
      validateRenames(moduleDir, new Map([['schemas/my-app/schema', 'schemas/my-app/schema']]))
    ).toThrow(/itself/);
  });

  it('allows swapping through the rename map itself', () => {
    expect(() =>
      validateRenames(moduleDir, new Map([['schemas/my-app/schema', 'schemas/my_app/schema']]))
    ).not.toThrow();
  });
});

describe('renameInPlanContent', () => {
  it('rewrites change names and plain dependency refs, preserving format', () => {
    const renames = new Map([['schemas/my-app/tables/users', 'schemas/my_app/tables/users']]);
    const out = renameInPlanContent(PLAN, renames);
    expect(out).toContain('schemas/my_app/tables/users [schemas/my-app/schema] 2024-01-01T00:00:01Z');
    expect(out).toContain('[schemas/my-app/schema schemas/my_app/tables/users]');
    expect(out).toContain('[schemas/my_app/tables/users auth:schemas/auth/tables/users]');
    // cross-package ref untouched
    expect(out).toContain('auth:schemas/auth/tables/users');
    // metadata untouched
    expect(out).toContain('%project=my-module');
  });

  it('does not rewrite partial-name matches', () => {
    const renames = new Map([['schemas/my-app/schema', 'schemas/my_app/schema']]);
    const out = renameInPlanContent(PLAN, renames);
    // longer change names sharing the prefix are untouched
    expect(out).toContain('schemas/my-app/tables/users [schemas/my_app/schema]');
    expect(out).toContain('schemas/my-app/tables/posts [schemas/my_app/schema schemas/my-app/tables/users]');
  });
});

describe('renameChanges', () => {
  it('moves files, rewrites headers of moved scripts and dependents, and rewrites the plan', () => {
    const renames = new Map([
      ['schemas/my-app/schema', 'schemas/my_app/schema'],
      ['schemas/my-app/tables/users', 'schemas/my_app/tables/users'],
      ['schemas/my-app/tables/posts', 'schemas/my_app/tables/posts']
    ]);
    const result = renameChanges(moduleDir, renames);

    // files moved in all three script dirs
    expect(existsSync(join(moduleDir, 'deploy/schemas/my_app/tables/users.sql'))).toBe(true);
    expect(existsSync(join(moduleDir, 'deploy/schemas/my-app/tables/users.sql'))).toBe(false);
    expect(existsSync(join(moduleDir, 'revert/schemas/my_app/tables/users.sql'))).toBe(true);
    expect(existsSync(join(moduleDir, 'verify/schemas/my_app/tables/users.sql'))).toBe(true);
    // old empty dirs cleaned up
    expect(existsSync(join(moduleDir, 'deploy/schemas/my-app'))).toBe(false);
    expect(result.filesMoved.length).toBe(5);

    // moved script headers rewritten (identity + requires), format preserved
    const users = readFileSync(join(moduleDir, 'deploy/schemas/my_app/tables/users.sql'), 'utf-8');
    expect(users).toContain('-- Deploy my-module:schemas/my_app/tables/users to pg');
    expect(users).toContain('-- requires: schemas/my_app/schema');
    // body untouched
    expect(users).toContain('CREATE TABLE "my-app".users (id int);');

    // dependent outside the rename set has requires rewritten, cross-package ref untouched
    const fn = readFileSync(join(moduleDir, 'deploy/schemas/other/functions/fn.sql'), 'utf-8');
    expect(fn).toContain('-- requires: schemas/my_app/tables/users');
    expect(fn).toContain('-- requires: auth:schemas/auth/tables/users');

    // plan rewritten
    const plan = readFileSync(join(moduleDir, 'pgpm.plan'), 'utf-8');
    expect(plan).toContain('schemas/my_app/tables/posts [schemas/my_app/schema schemas/my_app/tables/users]');
    expect(plan).toContain('[schemas/my_app/tables/users auth:schemas/auth/tables/users]');
    expect(result.planRewritten).toBe(true);
  });

  it('is a no-op for an empty rename map', () => {
    const before = readFileSync(join(moduleDir, 'pgpm.plan'), 'utf-8');
    const result = renameChanges(moduleDir, new Map());
    expect(result.filesMoved).toEqual([]);
    expect(result.planRewritten).toBe(false);
    expect(readFileSync(join(moduleDir, 'pgpm.plan'), 'utf-8')).toBe(before);
  });

  it('dry run reports without touching the filesystem', () => {
    const renames = new Map([['schemas/my-app/tables/users', 'schemas/my_app/tables/users']]);
    const before = readFileSync(join(moduleDir, 'deploy/schemas/my-app/tables/users.sql'), 'utf-8');
    const result = renameChanges(moduleDir, renames, { dryRun: true });

    expect(existsSync(join(moduleDir, 'deploy/schemas/my-app/tables/users.sql'))).toBe(true);
    expect(existsSync(join(moduleDir, 'deploy/schemas/my_app/tables/users.sql'))).toBe(false);
    expect(readFileSync(join(moduleDir, 'deploy/schemas/my-app/tables/users.sql'), 'utf-8')).toBe(before);
    expect(readFileSync(join(moduleDir, 'pgpm.plan'), 'utf-8')).toBe(PLAN);
    expect(result.dryRunReport!.length).toBeGreaterThan(0);
    expect(result.planRewritten).toBe(true);
  });

  it('throws when a target file already exists on disk', () => {
    writeScript('deploy/schemas/my_app/tables/users.sql', '-- Deploy schemas/my_app/tables/users\n');
    expect(() =>
      renameChanges(moduleDir, new Map([['schemas/my-app/tables/users', 'schemas/my_app/tables/users']]))
    ).toThrow(/already exists/);
  });
});

describe('deriveRenamesFromSchemaMapping', () => {
  it('derives renames for changes under renamed schemas only', () => {
    const renames = deriveRenamesFromSchemaMapping(moduleDir, new Map([['my-app', 'my_app']]));
    expect(renames.get('schemas/my-app/schema')).toBe('schemas/my_app/schema');
    expect(renames.get('schemas/my-app/tables/users')).toBe('schemas/my_app/tables/users');
    expect(renames.get('schemas/my-app/tables/posts')).toBe('schemas/my_app/tables/posts');
    expect(renames.has('schemas/other/functions/fn')).toBe(false);
    expect(renames.size).toBe(3);
  });

  it('composes with renameChanges end to end', () => {
    const renames = deriveRenamesFromSchemaMapping(moduleDir, new Map([['my-app', 'my_app']]));
    const result = renameChanges(moduleDir, renames);
    expect(result.planRewritten).toBe(true);
    const plan = readFileSync(join(moduleDir, 'pgpm.plan'), 'utf-8');
    expect(plan).not.toContain('schemas/my-app/');
  });
});
