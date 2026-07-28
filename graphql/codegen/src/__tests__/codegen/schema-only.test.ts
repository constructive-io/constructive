import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { runCodegenOperation } from '../../cli/handler';
import { generate } from '../../core/generate';

const EXAMPLE_SCHEMA = path.resolve(
  __dirname,
  '../../../examples/example.schema.graphql'
);

describe('generate() with schema.enabled', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-only-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes SDL to file from schemaFile source', async () => {
    const result = await generate({
      schemaFile: EXAMPLE_SCHEMA,
      schema: { enabled: true, output: tempDir },
    });

    expect(result.success).toBe(true);
    expect(result.filesWritten).toHaveLength(1);

    const outFile = path.join(tempDir, 'schema.graphql');
    expect(fs.existsSync(outFile)).toBe(true);

    const sdl = fs.readFileSync(outFile, 'utf8');
    expect(sdl).toContain('type Query');
    expect(sdl).toContain('type User');
  });

  it('uses custom filename when schema.filename is set', async () => {
    const result = await generate({
      schemaFile: EXAMPLE_SCHEMA,
      schema: { enabled: true, output: tempDir, filename: 'app.graphql' },
    });

    expect(result.success).toBe(true);
    const outFile = path.join(tempDir, 'app.graphql');
    expect(fs.existsSync(outFile)).toBe(true);
  });

  it('succeeds without any generators enabled', async () => {
    const result = await generate({
      schemaFile: EXAMPLE_SCHEMA,
      schema: { enabled: true, output: tempDir },
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Schema exported to');
  });

  it('fails when no source is specified', async () => {
    const result = await generate({
      schema: { enabled: true, output: tempDir },
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('No source specified');
  });

  it('creates output directory if it does not exist', async () => {
    const nestedDir = path.join(tempDir, 'nested', 'output');

    const result = await generate({
      schemaFile: EXAMPLE_SCHEMA,
      schema: { enabled: true, output: nestedDir },
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(nestedDir, 'schema.graphql'))).toBe(true);
  });

  it('does not create the schema output directory during a dry run', async () => {
    const outputDir = path.join(tempDir, 'dry-run-output');

    const result = await generate({
      schemaFile: EXAMPLE_SCHEMA,
      schema: { enabled: true, output: outputDir },
      dryRun: true,
    });

    expect(result.success).toBe(true);
    expect(result.filesWritten).toEqual([]);
    expect(result.planFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.fileChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'schema.graphql', action: 'create' }),
      ])
    );
    expect(fs.existsSync(outputDir)).toBe(false);
  });

  it('resolves relative source and output paths against an explicit cwd', async () => {
    const cwd = path.join(tempDir, 'project');
    fs.mkdirSync(path.join(cwd, 'schemas'), { recursive: true });
    fs.copyFileSync(EXAMPLE_SCHEMA, path.join(cwd, 'schemas', 'app.graphql'));
    const processCwd = process.cwd();

    const result = await generate({
      cwd,
      schemaFile: 'schemas/app.graphql',
      schema: { enabled: true, output: 'generated' },
    });

    expect(result.success).toBe(true);
    expect(result.output).toBe(path.join(cwd, 'generated'));
    expect(fs.existsSync(path.join(cwd, 'generated', 'schema.graphql'))).toBe(
      true
    );
    expect(process.cwd()).toBe(processCwd);
  });

  it('preserves rollback recovery evidence through the operation boundary', async () => {
    const source = path.join(tempDir, 'schema.graphql');
    const output = path.join(tempDir, 'generated');
    fs.copyFileSync(EXAMPLE_SCHEMA, source);

    const initial = await runCodegenOperation(
      {
        schemaFile: source,
        schemaEnabled: true,
        schemaOutput: output,
      },
      { cwd: tempDir }
    );
    expect(initial.hasError).toBe(false);
    fs.appendFileSync(
      source,
      '\nextend type Query { recoveryProbe: String }\n'
    );

    const nativeFs = require('node:fs') as typeof fs;
    const originalRename = nativeFs.renameSync;
    let renameCall = 0;
    const renameSpy = jest
      .spyOn(nativeFs, 'renameSync')
      .mockImplementation((from, to) => {
        renameCall += 1;
        if (renameCall === 2) throw new Error('injected commit failure');
        if (renameCall === 3) throw new Error('injected restore failure');
        return originalRename(from, to);
      });

    let operation: Awaited<ReturnType<typeof runCodegenOperation>>;
    try {
      operation = await runCodegenOperation(
        {
          schemaFile: source,
          schemaEnabled: true,
          schemaOutput: output,
        },
        { cwd: tempDir }
      );
    } finally {
      renameSpy.mockRestore();
    }

    expect(operation.hasError).toBe(true);
    expect(operation.recoveryPath).toBeDefined();
    expect(fs.existsSync(operation.recoveryPath!)).toBe(true);
    expect(operation.rollbackErrors?.join('\n')).toContain(
      'injected restore failure'
    );
    expect(operation.results[0].result.recoveryPath).toBe(
      operation.recoveryPath
    );
  });
});
