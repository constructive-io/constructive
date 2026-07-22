import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { modulePath, pgpmPath } from '../../src/workspace/paths';
import {
  generateModuleControl,
  generateModuleMakefile,
  writeMinimalModule,
  writeMinimalWorkspace,
} from '../../src/workspace/minimal';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pgpm-minimal-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('writeMinimalWorkspace', () => {
  it('writes a discoverable pgpm.json', () => {
    writeMinimalWorkspace(dir);
    expect(pgpmPath(dir)).toBe(dir);
    expect(JSON.parse(readFileSync(join(dir, 'pgpm.json'), 'utf-8')).packages).toEqual(['packages/*']);
  });

  it('does not clobber an existing pgpm.json when overwrite: false', () => {
    writeFileSync(join(dir, 'pgpm.json'), JSON.stringify({ packages: ['custom/*'] }));
    writeMinimalWorkspace(dir, { overwrite: false });
    expect(JSON.parse(readFileSync(join(dir, 'pgpm.json'), 'utf-8')).packages).toEqual(['custom/*']);
  });
});

describe('writeMinimalModule', () => {
  it('writes the minimal deployable module file set', () => {
    const mod = join(dir, 'packages', 'users');
    writeMinimalModule(mod, {
      name: 'users',
      changes: [{ name: 'users', dependencies: [] }],
      scripts: {
        users: {
          deploy: '-- Deploy users\nBEGIN;\nCREATE SCHEMA users;\nCOMMIT;\n',
          revert: '-- Revert users\nBEGIN;\nDROP SCHEMA users;\nCOMMIT;\n',
        },
      },
      requires: ['auth'],
    });

    expect(modulePath(mod)).toBe(mod);
    for (const f of ['pgpm.plan', 'users.control', 'Makefile', 'package.json', 'deploy/users.sql', 'revert/users.sql', 'verify/users.sql']) {
      expect(existsSync(join(mod, f))).toBe(true);
    }
    // default verify emitted when none provided
    expect(readFileSync(join(mod, 'verify', 'users.sql'), 'utf-8')).toContain('ROLLBACK;');
    expect(readFileSync(join(mod, 'users.control'), 'utf-8')).toContain("requires = 'auth'");
  });

  it('throws on a missing script and refuses non-empty dirs', () => {
    const mod = join(dir, 'packages', 'x');
    expect(() =>
      writeMinimalModule(mod, {
        name: 'x',
        changes: [{ name: 'x', dependencies: [] }],
        scripts: {},
      })
    ).toThrow(/Missing scripts/);

    writeFileSync(join(dir, 'sentinel'), 'x');
    expect(() =>
      writeMinimalModule(dir, { name: 'x', changes: [], scripts: {} })
    ).toThrow(/not empty/);
  });
});

describe('control + Makefile generators', () => {
  it('emits full control fields matching pgpm init shape', () => {
    const control = generateModuleControl('users', ['auth', 'citext']);
    expect(control).toContain("comment = 'users extension'");
    expect(control).toContain("default_version = '0.0.1'");
    expect(control).toContain("module_pathname = '$libdir/users'");
    expect(control).toContain("requires = 'auth,citext'");
    expect(control).toContain('relocatable = false');
    expect(control).toContain('superuser = false');
  });

  it('omits requires when there are no deps', () => {
    expect(generateModuleControl('users')).not.toContain('requires =');
  });

  it('emits a PGXS Makefile', () => {
    const mk = generateModuleMakefile('users');
    expect(mk).toContain('EXTENSION = users');
    expect(mk).toContain('DATA = sql/users--0.0.1.sql');
    expect(mk).toContain('include $(PGXS)');
  });
});
