import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { runCodegenOperation } from '../../cli/handler';
import { generate, generateMulti, TARGETS_MANIFEST } from '../../core/generate';
import { writeGeneratedFiles } from '../../core/output';

const EXAMPLE_SCHEMA = path.resolve(
  __dirname,
  '../../../examples/example.schema.graphql'
);

describe('generate() filesystem safety', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'generate-safety-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('keeps the reusable operation silent when verbose progress is requested', async () => {
    const output = path.join(tempDir, 'generated');
    const onProgress = jest.fn();
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const error = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    try {
      const result = await runCodegenOperation(
        {
          schemaFile: EXAMPLE_SCHEMA,
          output,
          orm: true,
          docs: false,
          verbose: true,
          dryRun: true,
        },
        { cwd: tempDir, onProgress }
      );

      expect(result.hasError).toBe(false);
      expect(onProgress).toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
      warn.mockRestore();
      error.mockRestore();
    }
  });

  it('plans every generated file without creating the output on dry run', async () => {
    const output = path.join(tempDir, 'generated');

    const result = await generate({
      schemaFile: EXAMPLE_SCHEMA,
      output,
      orm: true,
      docs: false,
      onProgress: () => undefined,
      dryRun: true,
    });

    expect(result.success).toBe(true);
    expect(result.plans).toHaveLength(1);
    expect(result.planFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(
      result.fileChanges?.some((change) => change.action === 'create')
    ).toBe(true);
    expect(result.filesWritten).toEqual([]);
    expect(fs.existsSync(output)).toBe(false);
  });

  it('accepts a multi-target config whose target is named endpoint', async () => {
    const configPath = path.join(tempDir, 'graphql-codegen.config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        endpoint: {
          schemaFile: EXAMPLE_SCHEMA,
          output: './generated/endpoint',
          orm: true,
          docs: false,
        },
      })
    );

    const result = await runCodegenOperation(
      { config: configPath, dryRun: true },
      { cwd: tempDir, onProgress: () => undefined }
    );

    expect(result.hasError).toBe(false);
    expect(result.results.map(({ name }) => name)).toEqual(['endpoint']);
  });

  it('prunes stale owned files while preserving unknown handwritten files', async () => {
    const output = path.join(tempDir, 'generated');
    const initial = await generate({
      schemaFile: EXAMPLE_SCHEMA,
      output,
      orm: true,
      reactQuery: true,
      docs: false,
      onProgress: () => undefined,
    });
    expect(initial.success).toBe(true);
    const handwritten = path.join(output, 'notes.ts');
    fs.writeFileSync(handwritten, 'export const handwritten = true;\n');

    const result = await generate({
      schemaFile: EXAMPLE_SCHEMA,
      output,
      orm: true,
      reactQuery: false,
      docs: false,
      onProgress: () => undefined,
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(handwritten)).toBe(true);
    expect(fs.existsSync(path.join(output, 'hooks'))).toBe(false);
    expect(
      result.fileChanges?.some((change) => change.action === 'delete')
    ).toBe(true);
  });

  it('rejects modified generated files unless overwrite is confirmed', async () => {
    const output = path.join(tempDir, 'generated');
    const initial = await generate({
      schemaFile: EXAMPLE_SCHEMA,
      output,
      orm: true,
      docs: false,
      onProgress: () => undefined,
    });
    expect(initial.success).toBe(true);

    const barrel = path.join(output, 'index.ts');
    fs.writeFileSync(barrel, 'export const manuallyEdited = true;\n');

    const conflict = await generate({
      schemaFile: EXAMPLE_SCHEMA,
      output,
      orm: true,
      docs: false,
      onProgress: () => undefined,
    });
    expect(conflict.success).toBe(false);
    expect(conflict.fileChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'index.ts',
          action: 'conflict',
          reason: 'modified-generated-file',
        }),
      ])
    );
    expect(fs.readFileSync(barrel, 'utf8')).toContain('manuallyEdited');

    const overwritten = await generate({
      schemaFile: EXAMPLE_SCHEMA,
      output,
      orm: true,
      docs: false,
      onProgress: () => undefined,
      overwriteModifiedGenerated: true,
      yes: true,
    });
    expect(overwritten.success).toBe(true);
    expect(fs.readFileSync(barrel, 'utf8')).toContain(
      '@generated by @constructive-io/graphql-codegen'
    );
  });

  it('does not commit an earlier target when a later target cannot be planned', async () => {
    const firstOutput = path.join(tempDir, 'generated', 'first');
    const secondOutput = path.join(tempDir, 'generated', 'second');

    const result = await generateMulti({
      configs: {
        first: {
          schemaFile: EXAMPLE_SCHEMA,
          output: firstOutput,
          orm: true,
          docs: false,
        },
        second: {
          schemaFile: path.join(tempDir, 'missing.graphql'),
          output: secondOutput,
          orm: true,
          docs: false,
        },
      },
      cwd: tempDir,
      onProgress: () => undefined,
    });

    expect(result.hasError).toBe(true);
    expect(result.results[0].result).toMatchObject({
      success: false,
      message: expect.stringContaining('was not applied'),
      filesWritten: [],
    });
    expect(result.results[0].result.message).not.toMatch(/generated|written/i);
    expect(fs.existsSync(firstOutput)).toBe(false);
    expect(fs.existsSync(secondOutput)).toBe(false);
  });

  it('does not report a target as applied when the coordinated write fails', async () => {
    const output = path.join(tempDir, 'generated', 'only');
    const nativeFs = require('node:fs') as typeof fs;
    const originalRename = nativeFs.renameSync;
    let failureInjected = false;
    const renameSpy = jest
      .spyOn(nativeFs, 'renameSync')
      .mockImplementation((from, to) => {
        if (
          !failureInjected &&
          String(from).includes('.codegen-transaction-') &&
          String(from).includes(`${path.sep}staged${path.sep}`)
        ) {
          failureInjected = true;
          throw new Error('injected coordinated write failure');
        }
        return originalRename(from, to);
      });

    let result: Awaited<ReturnType<typeof generateMulti>>;
    try {
      result = await generateMulti({
        configs: {
          only: {
            schemaFile: EXAMPLE_SCHEMA,
            output,
            orm: true,
            docs: false,
          },
        },
        cwd: tempDir,
        onProgress: () => undefined,
      });
    } finally {
      renameSpy.mockRestore();
    }

    expect(result.hasError).toBe(true);
    expect(result.results[0].result).toMatchObject({
      success: false,
      message: expect.stringContaining('was not applied'),
      filesWritten: [],
    });
    expect(result.results[0].result.message).not.toMatch(/generated|written/i);
    expect(fs.existsSync(path.join(output, 'index.ts'))).toBe(false);
  });

  it('preserves retained-transaction warnings on multi-target results', async () => {
    const output = path.join(tempDir, 'generated', 'first');
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

    let result: Awaited<ReturnType<typeof generateMulti>>;
    try {
      result = await generateMulti({
        configs: {
          first: {
            schemaFile: EXAMPLE_SCHEMA,
            output,
            orm: true,
            docs: false,
          },
        },
        cwd: tempDir,
        onProgress: () => undefined,
      });
    } finally {
      removeSpy.mockRestore();
    }

    expect(result.hasError).toBe(false);
    expect(result.warnings?.join('\n')).toContain(
      'injected transaction cleanup failure'
    );
    expect(result.recoveryPath).toBeDefined();
    expect(fs.existsSync(result.recoveryPath!)).toBe(true);
  });

  it('plans stale owned targets during dry run and removes them only on apply', async () => {
    const outputRoot = path.join(tempDir, 'generated');
    const staleOutput = path.join(outputRoot, 'stale');
    const currentOutput = path.join(outputRoot, 'current');
    const seeded = await writeGeneratedFiles(
      [{ path: 'owned.ts', content: 'export const stale = true;\n' }],
      staleOutput,
      [],
      { formatFiles: false, showProgress: false }
    );
    expect(seeded.success).toBe(true);
    fs.writeFileSync(
      path.join(outputRoot, TARGETS_MANIFEST),
      `${JSON.stringify(['stale'])}\n`
    );

    const dryRun = await generateMulti({
      configs: {
        current: {
          schemaFile: EXAMPLE_SCHEMA,
          output: currentOutput,
          orm: true,
          docs: false,
        },
      },
      cwd: tempDir,
      cleanStaleTargets: true,
      dryRun: true,
      onProgress: () => undefined,
    });

    expect(dryRun.hasError).toBe(false);
    expect(fs.existsSync(path.join(staleOutput, 'owned.ts'))).toBe(true);
    expect(dryRun.fileChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'owned.ts',
          action: 'delete',
        }),
      ])
    );

    const applied = await generateMulti({
      configs: {
        current: {
          schemaFile: EXAMPLE_SCHEMA,
          output: currentOutput,
          orm: true,
          docs: false,
        },
      },
      cwd: tempDir,
      cleanStaleTargets: true,
      onProgress: () => undefined,
    });

    expect(applied.hasError).toBe(false);
    expect(fs.existsSync(staleOutput)).toBe(false);
    expect(fs.existsSync(path.join(currentOutput, 'index.ts'))).toBe(true);
    expect(
      JSON.parse(
        fs.readFileSync(path.join(outputRoot, TARGETS_MANIFEST), 'utf8')
      )
    ).toEqual(['current']);
  });

  it('rejects traversal entries in the target manifest without touching siblings', async () => {
    const outputRoot = path.join(tempDir, 'generated');
    const victim = path.join(tempDir, 'victim');
    fs.mkdirSync(outputRoot, { recursive: true });
    const seeded = await writeGeneratedFiles(
      [{ path: 'owned.ts', content: 'export const victim = true;\n' }],
      victim,
      [],
      { formatFiles: false, showProgress: false }
    );
    expect(seeded.success).toBe(true);
    fs.writeFileSync(
      path.join(outputRoot, TARGETS_MANIFEST),
      `${JSON.stringify(['../victim'])}\n`
    );

    const result = await generateMulti({
      configs: {
        current: {
          schemaFile: EXAMPLE_SCHEMA,
          output: path.join(outputRoot, 'current'),
          orm: true,
          docs: false,
        },
      },
      cwd: tempDir,
      cleanStaleTargets: true,
      onProgress: () => undefined,
    });

    expect(result.hasError).toBe(true);
    expect(result.results[0].result.message).toContain(
      'Invalid target ownership manifest'
    );
    expect(fs.existsSync(path.join(victim, 'owned.ts'))).toBe(true);
    expect(fs.existsSync(path.join(outputRoot, 'current'))).toBe(false);
  });
});
