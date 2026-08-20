import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  CommandCatalogEntrySchema,
  CommandSchemaDocumentSchema,
  compileSchema,
  createCommandRegistry,
  defineCommand,
  exportDocumentation,
  generateCompletion,
  generateDocumentation,
  getHelpDocument,
  HelpDocumentSchema,
  renderHelp,
  Type,
} from '../src';

function command(id = 'project.inspect', path = ['project', 'inspect']) {
  return defineCommand({
    id,
    path,
    summary: 'Inspect a project.',
    input: Type.Object(
      { depth: Type.Optional(Type.Integer()) },
      { additionalProperties: false }
    ),
    output: Type.Object(
      { root: Type.String() },
      { additionalProperties: false }
    ),
    bindings: [
      {
        property: 'depth',
        sources: [{ kind: 'option', name: 'depth', short: 'd' }],
        valueType: 'number' as const,
        description: 'Maximum depth.',
      },
    ],
    examples: [
      { description: 'Inspect two levels.', argv: [...path, '--depth', '2'] },
    ],
    lifecycle: 'finite' as const,
    effect: 'read' as const,
    async execute(_input, context) {
      return { data: { root: context.cwd } };
    },
  });
}

describe('discovery projections and documentation ownership', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'cli-runtime-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('derives human help, JSON help, schemas, and completions from one registry', () => {
    const registry = createCommandRegistry([command()]);
    const catalog = registry.catalog();
    const schema = registry.schema('project.inspect');
    const help = getHelpDocument(registry, ['project', 'inspect']);
    expect(
      compileSchema(Type.Array(CommandCatalogEntrySchema)).validate(catalog)
    ).toBe(true);
    expect(compileSchema(CommandSchemaDocumentSchema).validate(schema)).toBe(
      true
    );
    expect(compileSchema(HelpDocumentSchema).validate(help)).toBe(true);
    expect(renderHelp(registry)).toContain('project inspect');
    expect(renderHelp(registry, ['project', 'inspect'])).toContain('--depth');
    expect(help.command?.id).toBe('project.inspect');
    expect(generateCompletion(registry, 'bash')).toContain('project');
    expect(generateCompletion(registry, 'zsh')).toContain('#compdef cnc');
    expect(generateCompletion(registry, 'fish')).toContain('complete -c cnc');
  });

  it('plans dry runs without writing and makes repeated exports idempotent', async () => {
    const registry = createCommandRegistry([command()]);
    const documentation = generateDocumentation(registry, {
      toolVersion: '7.31.0',
    });
    const dryRun = await exportDocumentation(directory, documentation, {
      dryRun: true,
    });
    expect(dryRun.applied).toBe(false);
    expect(dryRun.plan.entries.some((entry) => entry.action === 'create')).toBe(
      true
    );
    await expect(
      readFile(join(directory, 'catalog.json'))
    ).rejects.toMatchObject({ code: 'ENOENT' });

    expect((await exportDocumentation(directory, documentation)).applied).toBe(
      true
    );
    expect(
      JSON.parse(await readFile(join(directory, 'catalog.json'), 'utf8')).tool
    ).toBe('cnc');
    const repeated = await exportDocumentation(directory, documentation, {
      dryRun: true,
    });
    expect(
      repeated.plan.entries.every((entry) => entry.action === 'unchanged')
    ).toBe(true);
  });

  it('never overwrites unowned or manually modified files', async () => {
    const registry = createCommandRegistry([command()]);
    const documentation = generateDocumentation(registry, {
      toolVersion: '7.31.0',
    });
    await writeFile(join(directory, 'catalog.json'), 'user-owned\n');
    const unowned = await exportDocumentation(directory, documentation);
    expect(unowned.applied).toBe(false);
    expect(unowned.plan.conflicts).toContain('catalog.json');
    expect(await readFile(join(directory, 'catalog.json'), 'utf8')).toBe(
      'user-owned\n'
    );

    await rm(directory, { recursive: true, force: true });
    await mkdir(directory);
    await exportDocumentation(directory, documentation);
    const commandPage = join(directory, 'commands/project.inspect.md');
    await writeFile(commandPage, 'manual edit\n');
    const modified = await exportDocumentation(directory, documentation);
    expect(modified.applied).toBe(false);
    expect(modified.plan.conflicts).toContain('commands/project.inspect.md');
    expect(await readFile(commandPage, 'utf8')).toBe('manual edit\n');
  });

  it('prunes only previously owned, unmodified stale files', async () => {
    const original = createCommandRegistry([
      command(),
      command('project.status', ['project', 'status']),
    ]);
    await exportDocumentation(
      directory,
      generateDocumentation(original, { toolVersion: '7.31.0' })
    );
    const reduced = createCommandRegistry([command()]);
    const result = await exportDocumentation(
      directory,
      generateDocumentation(reduced, { toolVersion: '7.31.0' })
    );
    expect(result.applied).toBe(true);
    await expect(
      readFile(join(directory, 'commands/project.status.md'))
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
