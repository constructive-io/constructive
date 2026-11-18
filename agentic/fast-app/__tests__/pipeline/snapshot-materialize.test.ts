import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SnapshotManager } from '../../src/pipeline/snapshot';
import { COMPOSE_MARKER } from '../../src/pipeline/snapshot-clone';

// A snapshot already on disk, so materialize needs no template to compose.
function withSnapshot(): { root: string; appDir: string; snapshots: SnapshotManager } {
  const root = mkdtempSync(path.join(tmpdir(), 'materialize-test-'));
  const appDir = path.join(root, 'templates', 'k', 'app');
  mkdirSync(path.dirname(path.join(appDir, COMPOSE_MARKER)), { recursive: true });
  writeFileSync(path.join(appDir, COMPOSE_MARKER), '{}');
  writeFileSync(path.join(appDir, 'package.json'), '{}');
  writeFileSync(
    path.join(root, 'templates', 'current.json'),
    JSON.stringify({
      key: 'k',
      appDir,
      templateSha: 's',
      registryHash: 'r',
      registryUrl: '',
      composedAt: '',
    }),
  );
  // Offline: the check of the current sources fails, so the snapshot on disk is used.
  const offline = async (): Promise<never> => {
    throw new Error('offline');
  };
  return {
    root,
    appDir,
    snapshots: new SnapshotManager(path.join(root, 'templates'), {
      env: () => ({}),
      resolve: offline,
    }),
  };
}

test('a deleted project folder is not recreated by its app copy', async () => {
  const { root, snapshots } = withSnapshot();
  const projectDir = path.join(root, 'projects', 'gone');
  await assert.rejects(snapshots.materialize(projectDir), /is gone/);
  assert.equal(existsSync(projectDir), false);
});

test('forgetting a project stops its app copy before anything is written', async () => {
  const { root, snapshots } = withSnapshot();
  const projectDir = path.join(root, 'projects', 'deleted-meanwhile');
  mkdirSync(projectDir, { recursive: true });
  const copy = snapshots.materialize(projectDir);
  snapshots.forget(projectDir);
  await assert.rejects(copy, { name: 'AbortError' });
  assert.equal(existsSync(path.join(projectDir, 'packages')), false);
});

// Root reads an unreadable folder anyway, so the copy could not fail there.
(process.getuid?.() === 0 ? test.skip : test)(
  'a copy that fails partway leaves no app behind, so the next run copies again',
  async () => {
    const { root, appDir, snapshots } = withSnapshot();
    const locked = path.join(appDir, 'src', 'locked');
    mkdirSync(locked, { recursive: true });
    writeFileSync(path.join(locked, 'page.tsx'), '');
    chmodSync(locked, 0o000);
    const projectDir = path.join(root, 'projects', 'p');
    mkdirSync(projectDir, { recursive: true });
    try {
      await assert.rejects(snapshots.materialize(projectDir));
    } finally {
      chmodSync(locked, 0o755);
    }
    // Copied: jest's node:fs returns arrays of Node's realm, which deepStrictEqual tells apart.
    assert.deepEqual([...readdirSync(path.join(projectDir, 'packages'))], []);
  },
);

test('the first clone of a run waits for the check, so an updated template is never cloned from the old snapshot', async () => {
  const { root } = withSnapshot();
  const templates = path.join(root, 'templates');
  // The update's template, already composed under its own key.
  const updated = path.join(templates, 'k2', 'app');
  mkdirSync(path.dirname(path.join(updated, COMPOSE_MARKER)), { recursive: true });
  writeFileSync(path.join(updated, COMPOSE_MARKER), '{}');
  writeFileSync(path.join(updated, 'next.config.ts'), "export default { output: 'export' };\n");
  let checks = 0;
  const snapshots = new SnapshotManager(templates, {
    env: () => ({}),
    resolve: async () => {
      checks += 1;
      return {
        key: 'k2',
        root: '',
        templateSha: 's2',
        registryUrl: '',
        registryHash: 'r',
        manifest: { name: 'nextjs-app' },
      };
    },
  });

  assert.equal((await snapshots.ready()).key, 'k2');
  // Checked once per run: later clones take the adopted snapshot at once.
  assert.equal((await snapshots.ready()).key, 'k2');
  assert.equal(checks, 1);
});

test('a start offline keeps the last snapshot, and a later clone checks again, so an update lands', async () => {
  const { root } = withSnapshot();
  const templates = path.join(root, 'templates');
  const updated = path.join(templates, 'k2', 'app');
  mkdirSync(path.dirname(path.join(updated, COMPOSE_MARKER)), { recursive: true });
  writeFileSync(path.join(updated, COMPOSE_MARKER), '{}');
  let online = false;
  const snapshots = new SnapshotManager(templates, {
    env: () => ({}),
    resolve: async () => {
      if (!online) throw new Error('offline');
      return {
        key: 'k2',
        root: '',
        templateSha: 's2',
        registryUrl: '',
        registryHash: 'r',
        manifest: { name: 'nextjs-app' },
      };
    },
  });
  assert.equal((await snapshots.ready()).key, 'k');
  online = true;
  // This clone still takes the snapshot that stands, and checks again behind it.
  assert.equal((await snapshots.ready()).key, 'k');
  await snapshots.ensure();
  assert.equal((await snapshots.ready()).key, 'k2');
});
