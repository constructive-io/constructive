import fs from 'fs';
import os from 'os';
import path from 'path';

import { ensureSpawnHelperExecutable, nodePtyRoot } from '../src/spawn-helper';

function fakeNodePty(files: Record<string, number>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'node-pty-'));
  for (const [relative, mode] of Object.entries(files)) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'binary', { mode });
    fs.chmodSync(file, mode);
  }
  return root;
}

function mode(file: string): number {
  return fs.statSync(file).mode & 0o777;
}

describe('ensureSpawnHelperExecutable', () => {
  it('makes a prebuilt helper npm extracted as 0644 executable', () => {
    const root = fakeNodePty({
      'prebuilds/darwin-arm64/spawn-helper': 0o644,
      'prebuilds/darwin-arm64/pty.node': 0o644
    });

    const repaired = ensureSpawnHelperExecutable(root);

    expect(repaired).toEqual([path.join(root, 'prebuilds/darwin-arm64/spawn-helper')]);
    expect(mode(repaired[0])).toBe(0o755);
    // Only the helper is exec'd; the addon is loaded, so its mode is left alone.
    expect(mode(path.join(root, 'prebuilds/darwin-arm64/pty.node'))).toBe(0o644);
  });

  it('repairs every prebuild and a local node-gyp build alike', () => {
    const root = fakeNodePty({
      'prebuilds/darwin-arm64/spawn-helper': 0o644,
      'prebuilds/darwin-x64/spawn-helper': 0o644,
      'build/Release/spawn-helper': 0o644
    });

    expect(ensureSpawnHelperExecutable(root)).toHaveLength(3);
  });

  it('says nothing about a tree that is already correct, and reports it once', () => {
    const root = fakeNodePty({ 'prebuilds/darwin-arm64/spawn-helper': 0o755 });

    expect(ensureSpawnHelperExecutable(root)).toEqual([]);
  });

  it('is a no-op where node-pty ships no helper at all (every Linux install)', () => {
    const root = fakeNodePty({ 'build/Release/pty.node': 0o755 });

    expect(ensureSpawnHelperExecutable(root)).toEqual([]);
  });

  it('resolves the node-pty the runner will actually spawn through', () => {
    const root = nodePtyRoot();

    expect(fs.existsSync(path.join(root, 'package.json'))).toBe(true);
  });
});
