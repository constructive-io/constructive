import {
  CliError,
  defineCommand,
  Type,
  type CommandAdapterHookMap,
  type OperationContext,
} from '@constructive-io/cli-runtime';
import type { CodegenOperationResult } from '@constructive-io/graphql-codegen';
import { withLogsSuppressed } from '@pgpmjs/logger';
import type { Inquirerer } from 'inquirerer';

import { withConsoleSuppressed } from '../console-isolation';
import { importOptionalCapability } from './optional-capability';

const SENSITIVE_ENDPOINT_QUERY_PARTS = new Set([
  'auth',
  'authorization',
  'bearer',
  'cookie',
  'credential',
  'credentials',
  'jwt',
  'passwd',
  'password',
  'secret',
  'session',
  'signature',
  'token',
]);

const isSensitiveEndpointQueryKey = (key: string): boolean => {
  const separated = key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const compact = separated.join('');
  return (
    separated.some((part) => SENSITIVE_ENDPOINT_QUERY_PARTS.has(part)) ||
    compact.includes('apikey') ||
    compact.includes('privatekey') ||
    compact.includes('signingkey') ||
    compact === 'key' ||
    compact === 'sig'
  );
};

/** Reject credential-bearing endpoint URLs before codegen can describe them in an event. */
const assertSafeEndpoint = (
  endpoint: string | undefined,
  context: Pick<OperationContext, 'registerSensitiveValue'>
): void => {
  if (endpoint === undefined) return;

  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new CliError({
      code: 'CODEGEN_ENDPOINT_INVALID',
      category: 'validation',
      message: 'The codegen endpoint must be an absolute HTTP or HTTPS URL.',
      path: '/endpoint',
    });
  }

  context.registerSensitiveValue(parsed.username);
  context.registerSensitiveValue(parsed.password);
  let hasSensitiveQuery = false;
  for (const [key, value] of parsed.searchParams) {
    if (!isSensitiveEndpointQueryKey(key)) continue;
    hasSensitiveQuery = true;
    context.registerSensitiveValue(value);
  }

  if (
    endpoint.trim() !== endpoint ||
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.hash !== '' ||
    hasSensitiveQuery
  ) {
    throw new CliError({
      code: 'CODEGEN_ENDPOINT_INVALID',
      category: 'validation',
      message:
        'The codegen endpoint must not contain embedded credentials, credential-like query parameters, or a fragment.',
      path: '/endpoint',
    });
  }
};

const suppressOperationOutput = <T>(callback: () => Promise<T>): Promise<T> =>
  withConsoleSuppressed(() => withLogsSuppressed(callback));

const CodegenProgressSchema = Type.Object(
  {
    event: Type.Literal('codegen.progress'),
    phase: Type.Union([
      Type.Literal('schema.fetch'),
      Type.Literal('types.generate'),
      Type.Literal('hooks.generate'),
      Type.Literal('orm.generate'),
      Type.Literal('cli.generate'),
      Type.Literal('pgpm.prepare'),
    ]),
    message: Type.String(),
  },
  { additionalProperties: false }
);

const FileChangeSchema = Type.Object(
  {
    path: Type.String(),
    absolutePath: Type.String(),
    action: Type.Union([
      Type.Literal('create'),
      Type.Literal('update'),
      Type.Literal('delete'),
      Type.Literal('unchanged'),
      Type.Literal('conflict'),
    ]),
    previousHash: Type.Optional(Type.String()),
    generatedHash: Type.Optional(Type.String()),
    reason: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);

const GenerationPlanSchema = Type.Object(
  {
    version: Type.Literal(1),
    outputDir: Type.String(),
    manifestPath: Type.String(),
    fingerprint: Type.String(),
    changes: Type.Array(FileChangeSchema),
  },
  { additionalProperties: false }
);

type CodegenFileChange = CodegenOperationResult['fileChanges'][number];

const toWireFileChange = (change: CodegenFileChange) => ({
  path: change.path,
  absolutePath: change.absolutePath,
  action: change.action,
  ...(change.previousHash === undefined
    ? {}
    : { previousHash: change.previousHash }),
  ...(change.generatedHash === undefined
    ? {}
    : { generatedHash: change.generatedHash }),
  ...(change.reason === undefined ? {} : { reason: change.reason }),
});

const toWirePlan = (plan: CodegenOperationResult['plans'][number]) => ({
  version: plan.version,
  outputDir: plan.outputDir,
  manifestPath: plan.manifestPath,
  fingerprint: plan.fingerprint,
  changes: plan.changes.map(toWireFileChange),
});

const CodegenResultSchema = Type.Object(
  {
    name: Type.Optional(Type.String()),
    success: Type.Boolean(),
    message: Type.String(),
    output: Type.Optional(Type.String()),
    tables: Type.Optional(Type.Array(Type.String())),
    filesWritten: Type.Optional(Type.Array(Type.String())),
    filesRemoved: Type.Optional(Type.Array(Type.String())),
    errors: Type.Optional(Type.Array(Type.String())),
  },
  { additionalProperties: false }
);

const CodegenOutputSchema = Type.Object(
  {
    success: Type.Boolean(),
    dryRun: Type.Boolean(),
    planFingerprint: Type.Optional(Type.String()),
    results: Type.Array(CodegenResultSchema),
    plans: Type.Array(GenerationPlanSchema),
    fileChanges: Type.Array(FileChangeSchema),
  },
  { additionalProperties: false }
);

const CodegenInputSchema = Type.Object(
  {
    config: Type.Optional(Type.String({ minLength: 1 })),
    endpoint: Type.Optional(Type.String({ minLength: 1 })),
    schemaFile: Type.Optional(Type.String({ minLength: 1 })),
    schemaDir: Type.Optional(Type.String({ minLength: 1 })),
    schemas: Type.Optional(Type.String({ minLength: 1 })),
    apiNames: Type.Optional(Type.String({ minLength: 1 })),
    reactQuery: Type.Optional(Type.Boolean()),
    orm: Type.Optional(Type.Boolean()),
    cli: Type.Optional(Type.Boolean()),
    output: Type.Optional(Type.String({ minLength: 1 })),
    target: Type.Optional(Type.String({ minLength: 1 })),
    requestHeaderValue: Type.Optional(
      Type.String({ minLength: 1, writeOnly: true })
    ),
    dryRun: Type.Optional(Type.Boolean()),
    verbose: Type.Optional(Type.Boolean()),
    schemaEnabled: Type.Optional(Type.Boolean()),
    schemaOutput: Type.Optional(Type.String({ minLength: 1 })),
    schemaFilename: Type.Optional(Type.String({ minLength: 1 })),
    overwriteModifiedGenerated: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false }
);

const bool = (name: string, deprecatedAlias?: string) => ({
  kind: 'option' as const,
  name,
  ...(deprecatedAlias ? { deprecatedAliases: [deprecatedAlias] } : {}),
  negatable: true,
});

export const codegenCommand = defineCommand({
  id: 'codegen.generate',
  path: ['codegen'],
  summary: 'Generate typed GraphQL clients and export GraphQL schemas.',
  input: CodegenInputSchema,
  output: CodegenOutputSchema,
  events: CodegenProgressSchema,
  bindings: [
    { property: 'config', sources: [{ kind: 'option', name: 'config' }] },
    { property: 'endpoint', sources: [{ kind: 'option', name: 'endpoint' }] },
    {
      property: 'schemaFile',
      sources: [
        {
          kind: 'option',
          name: 'schema-file',
          deprecatedAliases: ['schemaFile'],
        },
      ],
    },
    {
      property: 'schemaDir',
      sources: [
        {
          kind: 'option',
          name: 'schema-dir',
          deprecatedAliases: ['schemaDir'],
        },
      ],
    },
    { property: 'schemas', sources: [{ kind: 'option', name: 'schemas' }] },
    {
      property: 'apiNames',
      sources: [
        { kind: 'option', name: 'api-names', deprecatedAliases: ['apiNames'] },
      ],
    },
    {
      property: 'reactQuery',
      sources: [bool('react-query', 'reactQuery')],
      valueType: 'boolean',
    },
    { property: 'orm', sources: [bool('orm')], valueType: 'boolean' },
    { property: 'cli', sources: [bool('cli')], valueType: 'boolean' },
    { property: 'output', sources: [{ kind: 'option', name: 'output' }] },
    { property: 'target', sources: [{ kind: 'option', name: 'target' }] },
    {
      property: 'requestHeaderValue',
      sources: [
        { kind: 'option', name: 'authorization', sensitive: true },
        {
          kind: 'environment',
          name: 'CNC_CODEGEN_AUTHORIZATION',
          sensitive: true,
        },
      ],
      conflict: 'error',
    },
    {
      property: 'dryRun',
      sources: [bool('dry-run', 'dryRun')],
      valueType: 'boolean',
    },
    { property: 'verbose', sources: [bool('verbose')], valueType: 'boolean' },
    {
      property: 'schemaEnabled',
      sources: [bool('schema-enabled', 'schemaEnabled')],
      valueType: 'boolean',
    },
    {
      property: 'schemaOutput',
      sources: [
        {
          kind: 'option',
          name: 'schema-output',
          deprecatedAliases: ['schemaOutput'],
        },
      ],
    },
    {
      property: 'schemaFilename',
      sources: [
        {
          kind: 'option',
          name: 'schema-filename',
          deprecatedAliases: ['schemaFilename'],
        },
      ],
    },
    {
      property: 'overwriteModifiedGenerated',
      sources: [
        bool('overwrite-modified-generated', 'overwriteModifiedGenerated'),
      ],
      valueType: 'boolean',
    },
  ],
  examples: [
    {
      argv: ['codegen', '--endpoint', 'http://localhost:5555/graphql', '--orm'],
    },
    {
      argv: ['codegen', '--config', 'graphql-codegen.config.json', '--dry-run'],
    },
    {
      argv: ['codegen', '--schema-file', 'schema.graphql', '--schema-enabled'],
    },
  ],
  lifecycle: 'finite',
  effect: 'write',
  capabilities: { dryRun: true, confirmation: true },
  async execute(input, context) {
    assertSafeEndpoint(input.endpoint, context);

    if (input.overwriteModifiedGenerated && !context.capabilities.yes) {
      throw new CliError({
        code: 'CLI_CONFIRMATION_REQUIRED',
        category: 'invocation',
        message: '--overwrite-modified-generated requires --yes.',
        path: '/overwriteModifiedGenerated',
      });
    }

    return suppressOperationOutput(async () => {
      const { CodegenOperationError, runCodegenOperation } =
        await importOptionalCapability(
          'codegen',
          '@constructive-io/graphql-codegen',
          () => import('@constructive-io/graphql-codegen')
        );

      let operation: CodegenOperationResult;
      let progressQueue = Promise.resolve();
      try {
        const { requestHeaderValue, ...operationInput } = input;
        operation = await runCodegenOperation(
          {
            ...operationInput,
            ...(requestHeaderValue === undefined
              ? {}
              : { authorization: requestHeaderValue }),
          },
          {
            cwd: context.cwd,
            env: context.env,
            signal: context.signal,
            allowExecutableConfig: false,
            requireSafeEndpoints: true,
            onSensitiveValue: (value) => context.registerSensitiveValue(value),
            overwriteModifiedGenerated: input.overwriteModifiedGenerated,
            yes: context.capabilities.yes,
            onProgress: (progress) => {
              progressQueue = progressQueue.then(() =>
                context.events.emit({ event: 'codegen.progress', ...progress })
              );
            },
          }
        );
        await progressQueue;
      } catch (error) {
        await progressQueue;
        if (error instanceof CodegenOperationError) {
          throw new CliError({
            code: error.code,
            category: 'configuration',
            message: error.message,
            cause: error,
          });
        }
        throw error;
      }

      if (operation.hasError) {
        const first = operation.results.find(
          ({ result }) => !result.success
        )?.result;
        const conflict = operation.fileChanges.some(
          ({ action }) => action === 'conflict'
        );
        throw new CliError({
          code: conflict ? 'GENERATED_FILE_MODIFIED' : 'CODEGEN_FAILED',
          category: conflict ? 'conflict' : 'operation',
          message: first?.message ?? 'Code generation failed.',
          details: {
            errors: operation.results.flatMap(
              ({ result }) => result.errors ?? []
            ),
            ...(operation.planFingerprint === undefined
              ? {}
              : { planFingerprint: operation.planFingerprint }),
            conflicts: operation.fileChanges
              .filter(({ action }) => action === 'conflict')
              .map(({ absolutePath }) => absolutePath),
            ...(operation.warnings === undefined
              ? {}
              : { warnings: operation.warnings }),
            ...(operation.recoveryPath === undefined
              ? {}
              : { recoveryPath: operation.recoveryPath }),
            ...(operation.rollbackErrors === undefined
              ? {}
              : { rollbackErrors: operation.rollbackErrors }),
          },
        });
      }

      const fileChanges = operation.fileChanges.map(toWireFileChange);
      return {
        data: {
          success: true,
          dryRun: input.dryRun === true,
          ...(operation.planFingerprint === undefined
            ? {}
            : { planFingerprint: operation.planFingerprint }),
          results: operation.results.map(({ name, result }) => ({
            ...(name === undefined ? {} : { name }),
            success: result.success,
            message: result.message,
            ...(result.output === undefined ? {} : { output: result.output }),
            ...(result.tables === undefined ? {} : { tables: result.tables }),
            ...(result.filesWritten === undefined
              ? {}
              : { filesWritten: result.filesWritten }),
            ...(result.filesRemoved === undefined
              ? {}
              : { filesRemoved: result.filesRemoved }),
            ...(result.errors === undefined ? {} : { errors: result.errors }),
          })),
          plans: operation.plans.map(toWirePlan),
          fileChanges,
        },
        ...(operation.warnings === undefined
          ? {}
          : {
              warnings: operation.warnings.map((message) => ({
                code:
                  operation.recoveryPath === undefined
                    ? 'CODEGEN_WARNING'
                    : 'CODEGEN_RECOVERY_RETAINED',
                message,
                ...(operation.recoveryPath === undefined
                  ? {}
                  : { path: operation.recoveryPath }),
              })),
            }),
        artifacts: [
          ...(input.dryRun === true
            ? []
            : fileChanges
                .filter(
                  ({ action }) => action === 'create' || action === 'update'
                )
                .map(({ absolutePath, generatedHash }) => ({
                  type: 'generated-file',
                  path: absolutePath,
                  ...(generatedHash === undefined
                    ? {}
                    : { digest: `sha256:${generatedHash}` }),
                }))),
          ...(operation.recoveryPath === undefined
            ? []
            : [
                {
                  type: 'codegen-recovery',
                  path: operation.recoveryPath,
                  description:
                    'Retained codegen transaction data requiring manual cleanup or recovery.',
                },
              ]),
        ],
      };
    });
  },
});

export const createCodegenHooks = (
  prompter: Inquirerer
): CommandAdapterHookMap => ({
  'codegen.generate': {
    collectInteractiveInput: async (input) => {
      const { codegenQuestions, hasResolvedCodegenSource } =
        await importOptionalCapability(
          'codegen',
          '@constructive-io/graphql-codegen',
          () => import('@constructive-io/graphql-codegen')
        );
      if (hasResolvedCodegenSource(input as Record<string, unknown>))
        return input as never;
      return (await prompter.prompt(
        input as Record<string, unknown>,
        codegenQuestions
      )) as never;
    },
    renderHuman: (result) => {
      const data = result.data as {
        dryRun: boolean;
        results: Array<{ name?: string; message: string }>;
      };
      return data.results
        .map(({ name, message }) => `${name ? `[${name}] ` : ''}${message}`)
        .join('\n');
    },
  },
});
