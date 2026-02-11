import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { writeGeneratedFiles } from '../../core/output';

describe('writeGeneratedFiles', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegen-write-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('removes stale TypeScript files when pruneStaleFiles is enabled', async () => {
    const staleRoot = path.join(tempDir, 'stale.ts');
    const staleNested = path.join(tempDir, 'nested', 'old.ts');
    fs.mkdirSync(path.dirname(staleNested), { recursive: true });
    fs.writeFileSync(staleRoot, 'export const stale = true;\n');
    fs.writeFileSync(staleNested, 'export const old = true;\n');

    const result = await writeGeneratedFiles(
      [{ path: 'nested/new.ts', content: 'export const fresh = true;\n' }],
      tempDir,
      [],
      {
        showProgress: false,
        formatFiles: false,
        pruneStaleFiles: true,
      },
    );

    expect(result.success).toBe(true);
    expect(fs.existsSync(staleRoot)).toBe(false);
    expect(fs.existsSync(staleNested)).toBe(false);
    expect(fs.existsSync(path.join(tempDir, 'nested', 'new.ts'))).toBe(true);
  });

  it('keeps existing files when pruneStaleFiles is disabled', async () => {
    const staleRoot = path.join(tempDir, 'stale.ts');
    fs.writeFileSync(staleRoot, 'export const stale = true;\n');

    const result = await writeGeneratedFiles(
      [{ path: 'fresh.ts', content: 'export const fresh = true;\n' }],
      tempDir,
      [],
      {
        showProgress: false,
        formatFiles: false,
        pruneStaleFiles: false,
      },
    );

    expect(result.success).toBe(true);
    expect(fs.existsSync(staleRoot)).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'fresh.ts'))).toBe(true);
  });
});
