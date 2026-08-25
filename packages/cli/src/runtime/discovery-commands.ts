import { resolve } from 'node:path';

import {
  CliError,
  type CommandAdapterHookMap,
  CommandCatalogEntrySchema,
  type CommandRegistry,
  CommandSchemaDocumentSchema,
  defineCommand,
  exportDocumentation,
  generateCompletion,
  generateDocumentation,
  getHelpDocument,
  HelpDocumentSchema,
  renderHelp,
  Type,
} from '@constructive-io/cli-runtime';

export interface DiscoveryCommandOptions {
  getRegistry(): CommandRegistry;
  toolVersion: string;
  toolName?: string;
}

export const createDiscoveryCommands = ({
  getRegistry,
  toolVersion,
  toolName = 'cnc',
}: DiscoveryCommandOptions) => {
  const commandsCommand = defineCommand({
    id: 'discovery.commands',
    path: ['commands'],
    summary: 'List executable command contracts.',
    input: Type.Object(
      { prefix: Type.Optional(Type.Array(Type.String())) },
      { additionalProperties: false }
    ),
    output: Type.Object(
      { commands: Type.Array(CommandCatalogEntrySchema) },
      { additionalProperties: false }
    ),
    bindings: [
      {
        property: 'prefix',
        sources: [
          { kind: 'positional', index: 0, name: 'prefix', variadic: true },
        ],
        repeated: true,
        description: 'Optional command path prefix.',
      },
    ],
    examples: [
      { argv: ['commands', '--format', 'json'] },
      { argv: ['commands', 'context', '--format', 'json'] },
    ],
    lifecycle: 'finite',
    effect: 'read',
    async execute(input) {
      return { data: { commands: getRegistry().catalog(input.prefix ?? []) } };
    },
  });

  const schemaCommand = defineCommand({
    id: 'discovery.schema',
    path: ['schema'],
    summary: 'Return the exact contract for one command.',
    input: Type.Object(
      { path: Type.Array(Type.String(), { minItems: 1 }) },
      { additionalProperties: false }
    ),
    output: Type.Object(
      { schema: CommandSchemaDocumentSchema },
      { additionalProperties: false }
    ),
    bindings: [
      {
        property: 'path',
        sources: [
          { kind: 'positional', index: 0, name: 'command', variadic: true },
        ],
        repeated: true,
        description: 'Command path to inspect.',
      },
    ],
    examples: [{ argv: ['schema', 'context', 'create', '--format', 'json'] }],
    lifecycle: 'finite',
    effect: 'read',
    async execute(input) {
      const command = getRegistry().requireByPath(input.path);
      return { data: { schema: getRegistry().schema(command.id) } };
    },
  });

  const helpCommand = defineCommand({
    id: 'discovery.help',
    path: ['help'],
    summary: 'Show registry-generated help.',
    input: Type.Object(
      { path: Type.Optional(Type.Array(Type.String())) },
      { additionalProperties: false }
    ),
    output: Type.Object(
      { text: Type.String(), document: HelpDocumentSchema },
      { additionalProperties: false }
    ),
    bindings: [
      {
        property: 'path',
        sources: [
          { kind: 'positional', index: 0, name: 'command', variadic: true },
        ],
        repeated: true,
        description: 'Optional command path.',
      },
    ],
    examples: [{ argv: ['help', 'execute'] }],
    lifecycle: 'finite',
    effect: 'read',
    async execute(input) {
      const path = input.path ?? [];
      const registry = getRegistry();
      if (
        path.length > 0 &&
        !registry.getByPath(path) &&
        registry.list(path).length === 0
      ) {
        throw new CliError({
          code: 'CLI_COMMAND_NOT_FOUND',
          category: 'invocation',
          message: 'No command is registered for the requested help path.',
        });
      }
      return {
        data: {
          text: renderHelp(registry, path, toolName),
          document: getHelpDocument(registry, path, toolName),
        },
      };
    },
  });

  const docsExportCommand = defineCommand({
    id: 'discovery.docs-export',
    path: ['docs', 'export'],
    summary: 'Export version-matched Markdown, schemas, and a CNC Skill.',
    input: Type.Object(
      {
        target: Type.String({ minLength: 1 }),
        dryRun: Type.Optional(Type.Boolean()),
      },
      { additionalProperties: false }
    ),
    output: Type.Object(
      {
        target: Type.String(),
        fingerprint: Type.String(),
        applied: Type.Boolean(),
        changes: Type.Array(
          Type.Object(
            {
              path: Type.String(),
              action: Type.Union([
                Type.Literal('create'),
                Type.Literal('update'),
                Type.Literal('delete'),
                Type.Literal('unchanged'),
                Type.Literal('conflict'),
              ]),
            },
            { additionalProperties: false }
          )
        ),
      },
      { additionalProperties: false }
    ),
    bindings: [
      {
        property: 'target',
        sources: [{ kind: 'option', name: 'target' }],
        description: 'Output directory.',
      },
      {
        property: 'dryRun',
        sources: [
          { kind: 'option', name: 'dry-run', deprecatedAliases: ['dryRun'] },
        ],
        valueType: 'boolean',
        description: 'Plan documentation changes without writing.',
      },
    ],
    examples: [
      {
        argv: [
          'docs',
          'export',
          '--target',
          '.constructive/agent-docs',
          '--dry-run',
        ],
      },
    ],
    lifecycle: 'finite',
    effect: 'write',
    capabilities: { dryRun: true },
    async execute(input, context) {
      const target = resolve(context.cwd, input.target);
      const documentation = generateDocumentation(getRegistry(), {
        toolName,
        toolVersion,
        skillName: 'constructive-cli',
      });
      const exported = await exportDocumentation(target, documentation, {
        dryRun: input.dryRun === true,
      });
      if (exported.plan.conflicts.length > 0) {
        throw new CliError({
          code: 'GENERATED_FILE_MODIFIED',
          category: 'conflict',
          message:
            'Documentation export would overwrite modified generated files.',
          details: { paths: exported.plan.conflicts },
        });
      }
      const changes = exported.plan.entries.map(({ path, action }) => ({
        path,
        action,
      }));
      return {
        data: {
          target: exported.plan.target,
          fingerprint: exported.plan.fingerprint,
          applied: exported.applied,
          changes,
        },
        artifacts: exported.applied
          ? changes
            .filter(
              ({ action }) => action === 'create' || action === 'update'
            )
            .map(({ path }) => ({
              type: 'agent-documentation',
              path: resolve(exported.plan.target, path),
            }))
          : [],
      };
    },
  });

  const completionCommand = defineCommand({
    id: 'discovery.completion',
    path: ['completion'],
    summary: 'Generate shell completion from the command registry.',
    input: Type.Object(
      {
        shell: Type.Union([
          Type.Literal('bash'),
          Type.Literal('zsh'),
          Type.Literal('fish'),
        ]),
      },
      { additionalProperties: false }
    ),
    output: Type.Object(
      { shell: Type.String(), script: Type.String() },
      { additionalProperties: false }
    ),
    bindings: [
      {
        property: 'shell',
        sources: [{ kind: 'positional', index: 0, name: 'shell' }],
        description: 'Shell name: bash, zsh, or fish.',
      },
    ],
    examples: [{ argv: ['completion', 'zsh'] }],
    lifecycle: 'finite',
    effect: 'read',
    async execute(input) {
      return {
        data: {
          shell: input.shell,
          script: generateCompletion(getRegistry(), input.shell, toolName),
        },
      };
    },
  });

  return [
    commandsCommand,
    schemaCommand,
    helpCommand,
    docsExportCommand,
    completionCommand,
  ] as const;
};

export const createDiscoveryHooks = (): CommandAdapterHookMap => ({
  'discovery.commands': {
    renderHuman: (result) => {
      const data = result.data as {
        commands: Array<{ path: string[]; summary: string }>;
      };
      return data.commands
        .map(({ path, summary }) => `${path.join(' ').padEnd(28)} ${summary}`)
        .join('\n');
    },
  },
  'discovery.schema': {
    renderHuman: (result) =>
      JSON.stringify((result.data as { schema: unknown }).schema, null, 2),
  },
  'discovery.help': {
    renderHuman: (result) => (result.data as { text: string }).text.trimEnd(),
  },
  'discovery.docs-export': {
    renderHuman: (result) => {
      const data = result.data as {
        target: string;
        applied: boolean;
        changes: Array<{ action: string }>;
      };
      const changed = data.changes.filter(
        ({ action }) => action !== 'unchanged'
      ).length;
      return `${data.applied ? 'Exported' : 'Planned'} ${changed} documentation change(s) in ${data.target}.`;
    },
  },
  'discovery.completion': {
    renderHuman: (result) =>
      (result.data as { script: string }).script.trimEnd(),
  },
});

export type DiscoveryCommand = ReturnType<
  typeof createDiscoveryCommands
>[number];
