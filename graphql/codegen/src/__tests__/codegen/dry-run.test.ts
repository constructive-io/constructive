import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { runCodegenHandler } from '../../cli/handler';
import { generate, generateMulti, TARGETS_MANIFEST } from '../../core/generate';

const EXAMPLE_SCHEMA = path.resolve(
  __dirname,
  '../../../examples/example.schema.graphql',
);

const createNoopPrompter = () => ({
  prompt: jest.fn(async (argv: Record<string, unknown>) => argv),
});

describe('codegen --dry-run writes nothing in every mode', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegen-dry-run-test-'));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('generate() schema-only export', () => {
    it('does not create output directory or file when dryRun is true', async () => {
      const outDir = path.join(tempDir, 'nested', 'schemas');

      const result = await generate({
        schemaFile: EXAMPLE_SCHEMA,
        schema: { enabled: true, output: outDir },
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.filesWritten).toEqual([]);
      expect(result.message).toMatch(/dry run/i);
      expect(fs.existsSync(outDir)).toBe(false);
    });

    it('does not overwrite an existing schema snapshot when dryRun is true', async () => {
      const outDir = path.join(tempDir, 'schema');
      fs.mkdirSync(outDir, { recursive: true });
      const existingFile = path.join(outDir, 'schema.graphql');
      const sentinel = 'existing snapshot\n';
      fs.writeFileSync(existingFile, sentinel, 'utf-8');

      const result = await generate({
        schemaFile: EXAMPLE_SCHEMA,
        schema: { enabled: true, output: outDir },
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.filesWritten).toEqual([]);
      expect(fs.readFileSync(existingFile, 'utf-8')).toBe(sentinel);
    });
  });

  describe('generate() full SDK + CLI + skills', () => {
    it('writes no SDK, docs, or skill files when dryRun is true', async () => {
      const outDir = path.join(tempDir, 'sdk');
      const skillsDir = path.join(tempDir, 'skills');

      const result = await generate({
        schemaFile: EXAMPLE_SCHEMA,
        output: outDir,
        orm: true,
        reactQuery: true,
        cli: true,
        docs: { readme: true, agents: true, skills: true },
        skillsPath: skillsDir,
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.filesWritten).toEqual([]);
      expect(result.skills).toBeUndefined();
      expect(fs.existsSync(outDir)).toBe(false);
      expect(fs.existsSync(skillsDir)).toBe(false);
    });
  });

  describe('generateMulti()', () => {
    it('writes nothing and preserves stale targets when dryRun is true', async () => {
      process.chdir(tempDir);

      const outRoot = path.join(tempDir, 'out');
      const staleDir = path.join(outRoot, 'stale');
      fs.mkdirSync(staleDir, { recursive: true });
      fs.writeFileSync(path.join(staleDir, 'keep.ts'), 'export const keep = true;\n');
      fs.writeFileSync(path.join(outRoot, TARGETS_MANIFEST), JSON.stringify(['stale']) + '\n');

      const skillsDir = path.join(tempDir, 'skills');

      const { results, hasError } = await generateMulti({
        configs: {
          alpha: {
            schemaFile: EXAMPLE_SCHEMA,
            orm: true,
            cli: true,
            output: path.join(outRoot, 'alpha'),
            docs: { readme: true, agents: true, skills: true },
            skillsPath: skillsDir,
          },
          beta: {
            schemaFile: EXAMPLE_SCHEMA,
            orm: true,
            cli: true,
            output: path.join(outRoot, 'beta'),
            docs: { readme: true, agents: true, skills: true },
            skillsPath: skillsDir,
          },
        },
        dryRun: true,
        unifiedCli: true,
        cleanStaleTargets: true,
      });

      expect(hasError).toBe(false);
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.result.success && r.result.filesWritten?.length === 0)).toBe(true);
      expect(fs.existsSync(path.join(outRoot, 'alpha'))).toBe(false);
      expect(fs.existsSync(path.join(outRoot, 'beta'))).toBe(false);
      expect(fs.existsSync(path.join(outRoot, 'index.ts'))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, 'README.md'))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, 'cli'))).toBe(false);
      expect(fs.existsSync(skillsDir)).toBe(false);
      // Stale target dir and manifest must remain untouched
      expect(fs.existsSync(path.join(staleDir, 'keep.ts'))).toBe(true);
      expect(JSON.parse(fs.readFileSync(path.join(outRoot, TARGETS_MANIFEST), 'utf-8'))).toEqual(['stale']);
    });

    it('honors dryRun passed via cliOverrides or per-target config', async () => {
      process.chdir(tempDir);

      const outRoot = path.join(tempDir, 'out-overrides');

      const viaOverrides = await generateMulti({
        configs: {
          a: { schemaFile: EXAMPLE_SCHEMA, orm: true, output: path.join(outRoot, 'a') },
          b: { schemaFile: EXAMPLE_SCHEMA, orm: true, output: path.join(outRoot, 'b') },
        },
        cliOverrides: { dryRun: true },
      });

      expect(viaOverrides.hasError).toBe(false);
      expect(fs.existsSync(outRoot)).toBe(false);
      expect(fs.existsSync(path.join(tempDir, 'README.md'))).toBe(false);

      const outPerTarget = path.join(tempDir, 'out-per-target');
      const viaTarget = await generateMulti({
        configs: {
          a: { schemaFile: EXAMPLE_SCHEMA, orm: true, dryRun: true, output: path.join(outPerTarget, 'a') },
          b: { schemaFile: EXAMPLE_SCHEMA, orm: true, dryRun: true, output: path.join(outPerTarget, 'b') },
        },
      });

      expect(viaTarget.hasError).toBe(false);
      expect(fs.existsSync(outPerTarget)).toBe(false);
      expect(fs.existsSync(path.join(tempDir, 'README.md'))).toBe(false);
    });

    it('writes nothing in multi-target schema export mode when dryRun is true', async () => {
      process.chdir(tempDir);

      const schemaOut = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemaOut, { recursive: true });
      const existing = path.join(schemaOut, 'alpha.graphql');
      fs.writeFileSync(existing, 'existing alpha\n', 'utf-8');

      const { results, hasError } = await generateMulti({
        configs: {
          alpha: { schemaFile: EXAMPLE_SCHEMA },
          beta: { schemaFile: EXAMPLE_SCHEMA },
        },
        schema: { enabled: true, output: schemaOut },
        dryRun: true,
      });

      expect(hasError).toBe(false);
      expect(results).toHaveLength(2);
      expect(fs.readFileSync(existing, 'utf-8')).toBe('existing alpha\n');
      expect(fs.existsSync(path.join(schemaOut, 'beta.graphql'))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, 'README.md'))).toBe(false);
    });

    it('excludes dryRun targets from root barrel, manifest, and unified CLI in mixed runs', async () => {
      process.chdir(tempDir);

      const outRoot = path.join(tempDir, 'out-mixed');

      const { results, hasError } = await generateMulti({
        configs: {
          preview: {
            schemaFile: EXAMPLE_SCHEMA,
            orm: true,
            dryRun: true,
            output: path.join(outRoot, 'preview'),
            docs: { readme: false, agents: false, skills: false },
          },
          real: {
            schemaFile: EXAMPLE_SCHEMA,
            orm: true,
            output: path.join(outRoot, 'real'),
            docs: { readme: false, agents: false, skills: false },
          },
        },
      });

      expect(hasError).toBe(false);
      expect(results).toHaveLength(2);
      expect(fs.existsSync(path.join(outRoot, 'preview'))).toBe(false);
      expect(fs.existsSync(path.join(outRoot, 'real', 'orm', 'index.ts'))).toBe(true);

      const barrel = fs.readFileSync(path.join(outRoot, 'index.ts'), 'utf-8');
      expect(barrel).toContain('./real');
      expect(barrel).not.toContain('./preview');

      const manifest = JSON.parse(fs.readFileSync(path.join(outRoot, TARGETS_MANIFEST), 'utf-8'));
      expect(manifest).toEqual(['real']);
    });
  });

  describe('runCodegenHandler() CLI paths', () => {
    it('does not overwrite schema snapshot with --schema-enabled --dry-run', async () => {
      process.chdir(tempDir);

      const schemaOut = path.join(tempDir, 'schema');
      fs.mkdirSync(schemaOut, { recursive: true });
      const existing = path.join(schemaOut, 'schema.graphql');
      const sentinel = 'existing snapshot\n';
      fs.writeFileSync(existing, sentinel, 'utf-8');

      await runCodegenHandler(
        {
          'schema-file': EXAMPLE_SCHEMA,
          'schema-enabled': true,
          'schema-output': schemaOut,
          'dry-run': true,
        },
        createNoopPrompter(),
      );

      expect(fs.readFileSync(existing, 'utf-8')).toBe(sentinel);
    });

    it('writes no SDK or root files for multi-target --config with --dry-run', async () => {
      process.chdir(tempDir);

      const configPath = path.join(tempDir, 'codegen.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auth: { schemaFile: EXAMPLE_SCHEMA, orm: true, output: './out/auth' },
          platform: { schemaFile: EXAMPLE_SCHEMA, orm: true, output: './out/platform' },
        }),
        'utf-8',
      );

      await runCodegenHandler(
        {
          config: configPath,
          'dry-run': true,
        },
        createNoopPrompter(),
      );

      expect(fs.readdirSync(tempDir)).toEqual(['codegen.json']);
    });

    it('writes no files for --schema-dir multi-target expansion with --dry-run', async () => {
      process.chdir(tempDir);

      const inputSchemas = path.join(tempDir, 'input-schemas');
      fs.mkdirSync(inputSchemas, { recursive: true });
      const sdl = fs.readFileSync(EXAMPLE_SCHEMA, 'utf-8');
      fs.writeFileSync(path.join(inputSchemas, 'alpha.graphql'), sdl, 'utf-8');
      fs.writeFileSync(path.join(inputSchemas, 'beta.graphql'), sdl, 'utf-8');

      // Simulate inquirerer injecting default `dry-run: false` if prompted
      const prompter = {
        prompt: jest.fn(async (argv: Record<string, unknown>) => ({
          ...argv,
          'dry-run': false,
        })),
      };

      const outDir = path.join(tempDir, 'out');
      await runCodegenHandler(
        {
          'schema-dir': inputSchemas,
          orm: true,
          output: outDir,
          'dry-run': true,
        },
        prompter,
      );

      expect(prompter.prompt).not.toHaveBeenCalled();
      expect(fs.existsSync(outDir)).toBe(false);
      expect(fs.existsSync(path.join(tempDir, 'README.md'))).toBe(false);
    });
  });
});
