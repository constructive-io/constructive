import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  expandApiNamesToMultiTarget,
  expandSchemaDirToMultiTarget,
  removeStaleTargetDirs,
  TARGETS_MANIFEST,
} from '../../core/generate';

describe('expandApiNamesToMultiTarget', () => {
  it('returns null for no apiNames', () => {
    expect(expandApiNamesToMultiTarget({})).toBeNull();
  });

  it('returns null for empty apiNames', () => {
    expect(expandApiNamesToMultiTarget({ db: { apiNames: [] } })).toBeNull();
  });

  it('returns null for single apiName', () => {
    expect(
      expandApiNamesToMultiTarget({ db: { apiNames: ['app'] } })
    ).toBeNull();
  });

  it('expands multiple apiNames into separate targets', () => {
    const result = expandApiNamesToMultiTarget({
      db: {
        apiNames: ['app', 'admin'],
        pgpm: { workspacePath: '/ws', moduleName: 'mod' },
      },
      output: './generated',
      orm: true,
      reactQuery: true,
    });

    expect(result).not.toBeNull();
    expect(Object.keys(result!)).toEqual(['app', 'admin']);

    expect(result!.app.db?.apiNames).toEqual(['app']);
    expect(result!.app.output).toBe('./generated/app');
    expect(result!.app.orm).toBe(true);
    expect(result!.app.reactQuery).toBe(true);
    expect(result!.app.db?.pgpm).toEqual({
      workspacePath: '/ws',
      moduleName: 'mod',
    });

    expect(result!.admin.db?.apiNames).toEqual(['admin']);
    expect(result!.admin.output).toBe('./generated/admin');
  });

  it('uses default output path when output is not specified', () => {
    const result = expandApiNamesToMultiTarget({
      db: { apiNames: ['app', 'admin'] },
    });

    expect(result!.app.output).toBe('./generated/graphql/app');
    expect(result!.admin.output).toBe('./generated/graphql/admin');
  });

  it('preserves all other config properties', () => {
    const result = expandApiNamesToMultiTarget({
      db: { apiNames: ['app', 'admin'], pgpm: { modulePath: '/mod' } },
      endpoint: 'http://example.com',
      tables: { include: ['users'] },
      hooks: { queries: true },
    });

    expect(result!.app.endpoint).toBe('http://example.com');
    expect(result!.app.tables).toEqual({ include: ['users'] });
    expect(result!.app.hooks).toEqual({ queries: true });
  });
});

describe('expandSchemaDirToMultiTarget', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'expand-schema-dir-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns null when schemaDir is not set', () => {
    expect(expandSchemaDirToMultiTarget({})).toBeNull();
  });

  it('returns null when directory does not exist', () => {
    expect(
      expandSchemaDirToMultiTarget({ schemaDir: '/nonexistent/path' })
    ).toBeNull();
  });

  it('returns null when directory has no .graphql files', () => {
    fs.writeFileSync(path.join(tempDir, 'readme.md'), 'hello');
    expect(expandSchemaDirToMultiTarget({ schemaDir: tempDir })).toBeNull();
  });

  it('expands .graphql files into separate targets named by filename', () => {
    fs.writeFileSync(
      path.join(tempDir, 'app.graphql'),
      'type Query { hello: String }'
    );
    fs.writeFileSync(
      path.join(tempDir, 'admin.graphql'),
      'type Query { users: [User] }'
    );

    const result = expandSchemaDirToMultiTarget({
      schemaDir: tempDir,
      output: './out',
      orm: true,
    });

    expect(result).not.toBeNull();
    expect(Object.keys(result!).sort()).toEqual(['admin', 'app']);

    expect(result!.app.schemaFile).toBe(path.join(tempDir, 'app.graphql'));
    expect(result!.app.output).toBe('./out/app');
    expect(result!.app.orm).toBe(true);
    expect(result!.app.schemaDir).toBeUndefined();

    expect(result!.admin.schemaFile).toBe(path.join(tempDir, 'admin.graphql'));
    expect(result!.admin.output).toBe('./out/admin');
  });

  it('uses default output path when output is not specified', () => {
    fs.writeFileSync(
      path.join(tempDir, 'api.graphql'),
      'type Query { ok: Boolean }'
    );

    const result = expandSchemaDirToMultiTarget({ schemaDir: tempDir });

    expect(result!.api.output).toBe('./generated/graphql/api');
  });

  it('ignores non-.graphql files', () => {
    fs.writeFileSync(
      path.join(tempDir, 'app.graphql'),
      'type Query { a: String }'
    );
    fs.writeFileSync(path.join(tempDir, 'notes.txt'), 'not a schema');
    fs.writeFileSync(path.join(tempDir, 'data.json'), '{}');

    const result = expandSchemaDirToMultiTarget({ schemaDir: tempDir });

    expect(Object.keys(result!)).toEqual(['app']);
  });

  it('sorts targets alphabetically', () => {
    fs.writeFileSync(
      path.join(tempDir, 'zebra.graphql'),
      'type Query { z: String }'
    );
    fs.writeFileSync(
      path.join(tempDir, 'alpha.graphql'),
      'type Query { a: String }'
    );
    fs.writeFileSync(
      path.join(tempDir, 'mid.graphql'),
      'type Query { m: String }'
    );

    const result = expandSchemaDirToMultiTarget({ schemaDir: tempDir });

    expect(Object.keys(result!)).toEqual(['alpha', 'mid', 'zebra']);
  });
});

describe('removeStaleTargetDirs', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-targets-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /** Write a .targets manifest listing the given names. */
  function writeManifest(names: string[]) {
    fs.writeFileSync(
      path.join(tempDir, TARGETS_MANIFEST),
      JSON.stringify(names)
    );
  }

  it('removes previous targets that are no longer current', () => {
    writeManifest(['admin', 'auth', 'public', 'objects']);
    fs.mkdirSync(path.join(tempDir, 'admin'));
    fs.mkdirSync(path.join(tempDir, 'auth'));
    fs.mkdirSync(path.join(tempDir, 'public'));
    fs.mkdirSync(path.join(tempDir, 'objects'));

    const removed = removeStaleTargetDirs(tempDir, ['admin', 'auth']);

    expect(removed.sort()).toEqual(['objects', 'public']);
    expect(fs.existsSync(path.join(tempDir, 'admin'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'auth'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'public'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, 'objects'))).toBe(false);
  });

  it('preserves directories not listed in manifest', () => {
    writeManifest(['admin', 'auth']);
    fs.mkdirSync(path.join(tempDir, 'admin'));
    fs.mkdirSync(path.join(tempDir, 'auth'));
    fs.mkdirSync(path.join(tempDir, 'config'));
    fs.mkdirSync(path.join(tempDir, 'utils'));

    const removed = removeStaleTargetDirs(tempDir, ['admin']);

    expect(removed).toEqual(['auth']);
    expect(fs.existsSync(path.join(tempDir, 'admin'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'auth'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, 'config'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'utils'))).toBe(true);
  });

  it('returns empty array when no manifest exists', () => {
    fs.mkdirSync(path.join(tempDir, 'admin'));
    fs.mkdirSync(path.join(tempDir, 'config'));

    const removed = removeStaleTargetDirs(tempDir, ['admin']);

    expect(removed).toEqual([]);
    expect(fs.existsSync(path.join(tempDir, 'config'))).toBe(true);
  });

  it('returns empty array when output root does not exist', () => {
    const removed = removeStaleTargetDirs('/nonexistent/path', ['admin']);
    expect(removed).toEqual([]);
  });

  it('returns empty array when no stale targets exist', () => {
    writeManifest(['admin', 'auth']);
    fs.mkdirSync(path.join(tempDir, 'admin'));
    fs.mkdirSync(path.join(tempDir, 'auth'));

    const removed = removeStaleTargetDirs(tempDir, ['admin', 'auth']);
    expect(removed).toEqual([]);
  });

  it('removes all previous targets when current list is empty', () => {
    writeManifest(['old-target']);
    fs.mkdirSync(path.join(tempDir, 'old-target'));

    const removed = removeStaleTargetDirs(tempDir, []);

    expect(removed).toEqual(['old-target']);
    expect(fs.existsSync(path.join(tempDir, 'old-target'))).toBe(false);
  });

  it('handles corrupt manifest gracefully', () => {
    fs.writeFileSync(path.join(tempDir, TARGETS_MANIFEST), 'not json');
    fs.mkdirSync(path.join(tempDir, 'admin'));

    const removed = removeStaleTargetDirs(tempDir, []);
    expect(removed).toEqual([]);
  });

  it('refuses target-manifest path traversal', () => {
    const victim = path.join(
      path.dirname(tempDir),
      `${path.basename(tempDir)}-victim`
    );
    fs.mkdirSync(victim);
    fs.writeFileSync(
      path.join(tempDir, TARGETS_MANIFEST),
      JSON.stringify([`../${path.basename(victim)}`])
    );

    try {
      const removed = removeStaleTargetDirs(tempDir, []);
      expect(removed).toEqual([]);
      expect(fs.existsSync(victim)).toBe(true);
    } finally {
      fs.rmSync(victim, { recursive: true, force: true });
    }
  });
});
