import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  GENERATED_FILES_MANIFEST,
  writeGeneratedFileJobs,
  writeGeneratedFiles,
} from '../../core/output';

describe('writeGeneratedFiles', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegen-write-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('removes only previously owned files when pruning is enabled', async () => {
    const staleRoot = path.join(tempDir, 'stale.ts');
    const staleNested = path.join(tempDir, 'nested', 'old.ts');
    const initial = await writeGeneratedFiles(
      [
        { path: 'stale.ts', content: 'export const stale = true;\n' },
        { path: 'nested/old.ts', content: 'export const old = true;\n' },
      ],
      tempDir,
      [],
      {
        showProgress: false,
        formatFiles: false,
        pruneStaleFiles: true,
      }
    );
    expect(initial.success).toBe(true);

    const result = await writeGeneratedFiles(
      [{ path: 'nested/new.ts', content: 'export const fresh = true;\n' }],
      tempDir,
      [],
      {
        showProgress: false,
        formatFiles: false,
        pruneStaleFiles: true,
      }
    );

    expect(result.success).toBe(true);
    expect(fs.existsSync(staleRoot)).toBe(false);
    expect(fs.existsSync(staleNested)).toBe(false);
    expect(fs.existsSync(path.join(tempDir, 'nested', 'new.ts'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, GENERATED_FILES_MANIFEST))).toBe(
      true
    );
  });

  it('keeps unowned files even when pruning is enabled', async () => {
    const handwritten = path.join(tempDir, 'handwritten.ts');
    fs.writeFileSync(handwritten, 'export const userOwned = true;\n');

    const result = await writeGeneratedFiles(
      [{ path: 'fresh.ts', content: 'export const fresh = true;\n' }],
      tempDir,
      [],
      {
        showProgress: false,
        formatFiles: false,
        pruneStaleFiles: true,
      }
    );

    expect(result.success).toBe(true);
    expect(fs.existsSync(handwritten)).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'fresh.ts'))).toBe(true);
  });

  it('reports a conflict instead of overwriting an unowned destination', async () => {
    const destination = path.join(tempDir, 'model.ts');
    fs.writeFileSync(destination, 'export const handwritten = true;\n');

    const result = await writeGeneratedFiles(
      [{ path: 'model.ts', content: 'export const generated = true;\n' }],
      tempDir,
      [],
      { showProgress: false, formatFiles: false }
    );

    expect(result.success).toBe(false);
    expect(result.plan?.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'model.ts',
          action: 'conflict',
          reason: 'unowned-existing-file',
        }),
      ])
    );
    expect(fs.readFileSync(destination, 'utf8')).toContain('handwritten');
  });

  it('does not claim an identical unowned file or prune it later', async () => {
    const destination = path.join(tempDir, 'model.ts');
    fs.writeFileSync(destination, 'export const same = true;\n');

    const result = await writeGeneratedFiles(
      [{ path: 'model.ts', content: 'export const same = true;\n' }],
      tempDir,
      [],
      { showProgress: false, formatFiles: false }
    );

    expect(result.success).toBe(false);
    expect(result.plan?.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'model.ts',
          action: 'conflict',
          reason: 'unowned-existing-file',
        }),
      ])
    );
    expect(fs.existsSync(path.join(tempDir, GENERATED_FILES_MANIFEST))).toBe(
      false
    );

    const prune = await writeGeneratedFiles([], tempDir, [], {
      showProgress: false,
      formatFiles: false,
      pruneStaleFiles: true,
    });
    expect(prune.success).toBe(true);
    expect(fs.readFileSync(destination, 'utf8')).toContain('same = true');
  });

  it('never lets the generated-file overwrite flag replace an unowned file', async () => {
    const destination = path.join(tempDir, 'model.ts');
    fs.writeFileSync(destination, 'export const handwritten = true;\n');

    const result = await writeGeneratedFiles(
      [{ path: 'model.ts', content: 'export const generated = true;\n' }],
      tempDir,
      [],
      {
        showProgress: false,
        formatFiles: false,
        overwriteModifiedGenerated: true,
        confirmOverwrite: true,
      }
    );

    expect(result.success).toBe(false);
    expect(result.plan?.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'model.ts',
          action: 'conflict',
          reason: 'unowned-existing-file',
        }),
      ])
    );
    expect(fs.readFileSync(destination, 'utf8')).toContain('handwritten');
  });

  it('refuses to traverse a symbolic-link ancestor below the output root', async () => {
    const output = path.join(tempDir, 'output');
    const external = path.join(tempDir, 'external');
    fs.mkdirSync(output);
    fs.mkdirSync(external);
    fs.symlinkSync(external, path.join(output, 'nested'));

    const result = await writeGeneratedFiles(
      [
        {
          path: 'nested/escaped.ts',
          content: 'export const escaped = true;\n',
        },
      ],
      output,
      [],
      { showProgress: false, formatFiles: false }
    );

    expect(result.success).toBe(false);
    expect(result.errors?.[0]).toContain('traverses a symlink');
    expect(fs.existsSync(path.join(external, 'escaped.ts'))).toBe(false);
  });

  it('rejects ownership-manifest paths outside the output root', async () => {
    const victim = path.join(
      path.dirname(tempDir),
      `${path.basename(tempDir)}-victim.ts`
    );
    fs.writeFileSync(victim, 'export const victim = true;\n');
    fs.writeFileSync(
      path.join(tempDir, GENERATED_FILES_MANIFEST),
      `${JSON.stringify({
        version: 1,
        generator: '@constructive-io/graphql-codegen',
        files: {
          [`../${path.basename(victim)}`]: { sha256: 'a'.repeat(64) },
        },
      })}\n`
    );

    try {
      const result = await writeGeneratedFiles(
        [{ path: 'safe.ts', content: 'export const safe = true;\n' }],
        tempDir,
        [],
        { showProgress: false, formatFiles: false }
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('invalid shape');
      expect(fs.readFileSync(victim, 'utf8')).toContain('victim = true');
    } finally {
      fs.rmSync(victim, { force: true });
    }
  });

  it('resolves an explicitly symlinked output root before staging', async () => {
    const actualOutput = path.join(tempDir, 'actual-output');
    const linkedOutput = path.join(tempDir, 'linked-output');
    fs.mkdirSync(actualOutput);
    fs.symlinkSync(actualOutput, linkedOutput);

    const result = await writeGeneratedFiles(
      [{ path: 'model.ts', content: 'export const model = true;\n' }],
      linkedOutput,
      [],
      { showProgress: false, formatFiles: false }
    );

    expect(result.success).toBe(true);
    expect(result.plan?.outputDir).toBe(fs.realpathSync(actualOutput));
    expect(fs.existsSync(path.join(actualOutput, 'model.ts'))).toBe(true);
  });

  it('requires explicit overwrite and confirmation for modified generated files', async () => {
    const generated = path.join(tempDir, 'model.ts');
    const initial = await writeGeneratedFiles(
      [{ path: 'model.ts', content: 'export const version = 1;\n' }],
      tempDir,
      [],
      { showProgress: false, formatFiles: false }
    );
    expect(initial.success).toBe(true);
    fs.writeFileSync(generated, 'export const manuallyEdited = true;\n');

    const withoutConfirmation = await writeGeneratedFiles(
      [{ path: 'model.ts', content: 'export const version = 2;\n' }],
      tempDir,
      [],
      {
        showProgress: false,
        formatFiles: false,
        overwriteModifiedGenerated: true,
      }
    );
    expect(withoutConfirmation.success).toBe(false);
    expect(withoutConfirmation.errors?.[0]).toContain('confirmOverwrite');

    const confirmed = await writeGeneratedFiles(
      [{ path: 'model.ts', content: 'export const version = 2;\n' }],
      tempDir,
      [],
      {
        showProgress: false,
        formatFiles: false,
        overwriteModifiedGenerated: true,
        confirmOverwrite: true,
      }
    );
    expect(confirmed.success).toBe(true);
    expect(fs.readFileSync(generated, 'utf8')).toContain('version = 2');
  });

  it('returns a complete plan without creating the output directory on dry run', async () => {
    const outputDir = path.join(tempDir, 'does-not-exist');

    const result = await writeGeneratedFiles(
      [{ path: 'nested/model.ts', content: 'export const model = true;\n' }],
      outputDir,
      [],
      {
        showProgress: false,
        formatFiles: false,
        pruneStaleFiles: true,
        dryRun: true,
      }
    );

    expect(result.success).toBe(true);
    expect(result.planFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.plan?.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'nested/model.ts',
          action: 'create',
        }),
        expect.objectContaining({
          path: GENERATED_FILES_MANIFEST,
          action: 'create',
        }),
      ])
    );
    expect(fs.existsSync(outputDir)).toBe(false);
  });

  it('adopts and updates legacy generated files with a recognized marker', async () => {
    const legacy = path.join(tempDir, 'legacy.ts');
    fs.writeFileSync(
      legacy,
      '/** @generated by @constructive-io/graphql-codegen */\nexport const old = true;\n'
    );

    const result = await writeGeneratedFiles(
      [
        {
          path: 'legacy.ts',
          content:
            '/** @generated by @constructive-io/graphql-codegen */\nexport const current = true;\n',
        },
      ],
      tempDir,
      [],
      { showProgress: false, formatFiles: false }
    );

    expect(result.success).toBe(true);
    expect(result.plan?.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'legacy.ts',
          action: 'update',
          reason: 'legacy-generated-file',
        }),
      ])
    );
  });

  it('retains backups when rollback restoration fails', async () => {
    const generated = path.join(tempDir, 'model.ts');
    const initial = await writeGeneratedFiles(
      [{ path: 'model.ts', content: 'export const version = 1;\n' }],
      tempDir,
      [],
      { showProgress: false, formatFiles: false }
    );
    expect(initial.success).toBe(true);

    const nativeFs = require('node:fs') as typeof fs;
    const originalRename = nativeFs.renameSync;
    let renameCall = 0;
    const renameSpy = jest
      .spyOn(nativeFs, 'renameSync')
      .mockImplementation((source, destination) => {
        renameCall += 1;
        if (renameCall === 2) throw new Error('injected commit failure');
        if (renameCall === 3) throw new Error('injected restore failure');
        return originalRename(source, destination);
      });

    let result: Awaited<ReturnType<typeof writeGeneratedFiles>>;
    try {
      result = await writeGeneratedFiles(
        [{ path: 'model.ts', content: 'export const version = 2;\n' }],
        tempDir,
        [],
        { showProgress: false, formatFiles: false }
      );
    } finally {
      renameSpy.mockRestore();
    }

    expect(result.success).toBe(false);
    expect(result.rollbackErrors?.join('\n')).toContain(
      'injected restore failure'
    );
    expect(result.recoveryPath).toBeDefined();
    expect(fs.existsSync(result.recoveryPath!)).toBe(true);
    expect(
      fs.existsSync(path.join(result.recoveryPath!, 'backup', 'model.ts'))
    ).toBe(true);
  });

  it('does not roll back committed files when transaction cleanup fails', async () => {
    const generated = path.join(tempDir, 'model.ts');
    const initial = await writeGeneratedFiles(
      [{ path: 'model.ts', content: 'export const version = 1;\n' }],
      tempDir,
      [],
      { showProgress: false, formatFiles: false }
    );
    expect(initial.success).toBe(true);

    const nativeFs = require('node:fs') as typeof fs;
    const originalRemove = nativeFs.rmSync;
    let cleanupFailureInjected = false;
    const removeSpy = jest
      .spyOn(nativeFs, 'rmSync')
      .mockImplementation((target, options) => {
        if (
          !cleanupFailureInjected &&
          String(target).includes('.codegen-transaction-')
        ) {
          cleanupFailureInjected = true;
          throw new Error('injected transaction cleanup failure');
        }
        return originalRemove(target, options);
      });

    let result: Awaited<ReturnType<typeof writeGeneratedFiles>>;
    try {
      result = await writeGeneratedFiles(
        [{ path: 'model.ts', content: 'export const version = 2;\n' }],
        tempDir,
        [],
        { showProgress: false, formatFiles: false }
      );
    } finally {
      removeSpy.mockRestore();
    }

    try {
      expect(result.success).toBe(true);
      expect(result.warnings?.join('\n')).toContain(
        'injected transaction cleanup failure'
      );
      expect(result.recoveryPath).toBeDefined();
      expect(fs.existsSync(result.recoveryPath!)).toBe(true);
      expect(fs.readFileSync(generated, 'utf8')).toContain('version = 2');
    } finally {
      if (result.recoveryPath) {
        fs.rmSync(result.recoveryPath, { recursive: true, force: true });
      }
    }
  });

  it('preflights every output root before committing the first root', async () => {
    const firstOutput = path.join(tempDir, 'first');
    const secondOutput = path.join(tempDir, 'second');
    fs.mkdirSync(secondOutput);
    fs.writeFileSync(
      path.join(secondOutput, 'model.ts'),
      'export const handwritten = true;\n'
    );

    const result = await writeGeneratedFileJobs(
      [
        {
          files: [
            { path: 'model.ts', content: 'export const first = true;\n' },
          ],
          outputDir: firstOutput,
          options: { formatFiles: false, showProgress: false },
        },
        {
          files: [
            { path: 'model.ts', content: 'export const second = true;\n' },
          ],
          outputDir: secondOutput,
          options: { formatFiles: false, showProgress: false },
        },
      ],
      { showProgress: false }
    );

    expect(result.success).toBe(false);
    expect(fs.existsSync(path.join(firstOutput, 'model.ts'))).toBe(false);
    expect(
      fs.readFileSync(path.join(secondOutput, 'model.ts'), 'utf8')
    ).toContain('handwritten');
  });

  it('rolls back earlier output roots when a later commit fails', async () => {
    const firstOutput = path.join(tempDir, 'first');
    const secondOutput = path.join(tempDir, 'second');
    const nativeFs = require('node:fs') as typeof fs;
    const originalRename = nativeFs.renameSync;
    let generatedRename = 0;
    const renameSpy = jest
      .spyOn(nativeFs, 'renameSync')
      .mockImplementation((source, destination) => {
        if (String(source).includes(`${path.sep}staged${path.sep}`)) {
          generatedRename += 1;
          if (generatedRename === 2) {
            throw new Error('injected second-root failure');
          }
        }
        return originalRename(source, destination);
      });

    let result: Awaited<ReturnType<typeof writeGeneratedFileJobs>>;
    try {
      result = await writeGeneratedFileJobs(
        [
          {
            files: [{ path: 'model.ts', content: 'first\n' }],
            outputDir: firstOutput,
            options: { formatFiles: false, showProgress: false },
          },
          {
            files: [{ path: 'model.ts', content: 'second\n' }],
            outputDir: secondOutput,
            options: { formatFiles: false, showProgress: false },
          },
        ],
        { showProgress: false }
      );
    } finally {
      renameSpy.mockRestore();
    }

    expect(result.success).toBe(false);
    expect(fs.existsSync(path.join(firstOutput, 'model.ts'))).toBe(false);
    expect(fs.existsSync(path.join(secondOutput, 'model.ts'))).toBe(false);
  });
});
