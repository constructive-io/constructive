import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { generate } from '../../core/generate';

const EXAMPLE_SCHEMA = path.resolve(
  __dirname,
  '../../../examples/example.schema.graphql',
);

describe('generate() with schemaOnly', () => {
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
      schemaOnly: true,
      schemaOnlyOutput: tempDir,
    });

    expect(result.success).toBe(true);
    expect(result.filesWritten).toHaveLength(1);

    const outFile = path.join(tempDir, 'schema.graphql');
    expect(fs.existsSync(outFile)).toBe(true);

    const sdl = fs.readFileSync(outFile, 'utf8');
    expect(sdl).toContain('type Query');
    expect(sdl).toContain('type User');
  });

  it('uses custom filename when schemaOnlyFilename is set', async () => {
    const result = await generate({
      schemaFile: EXAMPLE_SCHEMA,
      schemaOnly: true,
      schemaOnlyOutput: tempDir,
      schemaOnlyFilename: 'app.graphql',
    });

    expect(result.success).toBe(true);
    const outFile = path.join(tempDir, 'app.graphql');
    expect(fs.existsSync(outFile)).toBe(true);
  });

  it('succeeds without any generators enabled', async () => {
    const result = await generate({
      schemaFile: EXAMPLE_SCHEMA,
      schemaOnly: true,
      schemaOnlyOutput: tempDir,
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Schema exported to');
  });

  it('fails when no source is specified', async () => {
    const result = await generate({
      schemaOnly: true,
      schemaOnlyOutput: tempDir,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('No source specified');
  });

  it('creates output directory if it does not exist', async () => {
    const nestedDir = path.join(tempDir, 'nested', 'output');

    const result = await generate({
      schemaFile: EXAMPLE_SCHEMA,
      schemaOnly: true,
      schemaOnlyOutput: nestedDir,
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(nestedDir, 'schema.graphql'))).toBe(true);
  });
});
