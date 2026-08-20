import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

import {
  CliError,
  type CommandAdapterHookMap,
  defineCommand,
  isSensitiveKey,
  Type,
} from '@constructive-io/cli-runtime';
import type { Inquirerer } from 'inquirerer';

import { type ConfigStore,ConfigStoreError, redactSecrets } from '../config';
import {
  analyzeGraphQLDocument,
  assertMutationAllowed,
  execute,
  type FetchImplementation,
  getExecutionContext,
  type GraphQLClientError,
  type GraphQLError,
  GraphQLExecutionError,
} from '../sdk';

const ExecuteInputSchema = Type.Object(
  {
    query: Type.Optional(Type.String({ minLength: 1 })),
    file: Type.Optional(Type.String({ minLength: 1 })),
    variables: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    contextName: Type.Optional(Type.String({ minLength: 1 })),
    anonymous: Type.Optional(Type.Boolean()),
    operationName: Type.Optional(Type.String({ minLength: 1 })),
    timeoutMs: Type.Optional(Type.Integer({ minimum: 1 })),
    allowMutation: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false }
);

const ExecuteOutputSchema = Type.Object(
  {
    contextName: Type.String({ minLength: 1 }),
    endpoint: Type.String({ minLength: 1 }),
    anonymous: Type.Boolean(),
    operation: Type.Object(
      {
        type: Type.Union([Type.Literal('query'), Type.Literal('mutation')]),
        name: Type.Optional(Type.String()),
      },
      { additionalProperties: false }
    ),
    status: Type.Optional(Type.Integer({ minimum: 100, maximum: 599 })),
    data: Type.Unknown(),
  },
  { additionalProperties: false }
);

export interface ExecuteCommandDependencies {
  /** Injected configuration storage for embeddings and isolated tests. */
  store: ConfigStore;
  /** Injected transport used by tests and non-global runtimes. */
  fetch?: FetchImplementation;
}

const isWithin = (parent: string, candidate: string): boolean => {
  const pathFromParent = relative(parent, candidate);
  return (
    pathFromParent === '' ||
    (!pathFromParent.startsWith('..') && !isAbsolute(pathFromParent))
  );
};

const systemCode = (error: unknown): string | undefined =>
  error instanceof Error && 'code' in error
    ? String((error as NodeJS.ErrnoException).code)
    : undefined;

const loadQueryFile = async (cwd: string, file: string): Promise<string> => {
  let canonicalCwd: string;
  try {
    canonicalCwd = await realpath(cwd);
  } catch (cause) {
    throw new CliError({
      code: 'CWD_NOT_FOUND',
      category: 'configuration',
      message: 'The configured working directory does not exist.',
      details: { cwd },
      retryable: false,
      cause,
    });
  }

  const requestedPath = resolve(canonicalCwd, file);
  if (!isWithin(canonicalCwd, requestedPath)) {
    throw new CliError({
      code: 'GRAPHQL_FILE_OUTSIDE_CWD',
      category: 'authorization',
      message:
        'The GraphQL file must be inside the configured working directory.',
      path: '/file',
      details: { file },
      retryable: false,
    });
  }

  let canonicalFile: string;
  try {
    canonicalFile = await realpath(requestedPath);
  } catch (cause) {
    const code = systemCode(cause);
    throw new CliError({
      code:
        code === 'ENOENT'
          ? 'GRAPHQL_FILE_NOT_FOUND'
          : 'GRAPHQL_FILE_READ_FAILED',
      category: 'configuration',
      message:
        code === 'ENOENT'
          ? `GraphQL file "${file}" was not found.`
          : `GraphQL file "${file}" could not be resolved.`,
      path: '/file',
      details: { file, ...(code === undefined ? {} : { systemCode: code }) },
      retryable: false,
      cause,
    });
  }
  if (!isWithin(canonicalCwd, canonicalFile)) {
    throw new CliError({
      code: 'GRAPHQL_FILE_OUTSIDE_CWD',
      category: 'authorization',
      message:
        'The GraphQL file must not resolve outside the configured working directory.',
      path: '/file',
      details: { file },
      retryable: false,
    });
  }

  try {
    return await readFile(canonicalFile, 'utf8');
  } catch (cause) {
    const code = systemCode(cause);
    throw new CliError({
      code: 'GRAPHQL_FILE_READ_FAILED',
      category: 'configuration',
      message: `GraphQL file "${file}" could not be read.`,
      path: '/file',
      details: { file, ...(code === undefined ? {} : { systemCode: code }) },
      retryable: false,
      cause,
    });
  }
};

const mapConfigurationError = (error: ConfigStoreError): CliError =>
  new CliError({
    code: error.code,
    category:
      error.code === 'CONTEXT_NAME_INVALID' ||
      error.code === 'CONTEXT_ENDPOINT_INVALID'
        ? 'validation'
        : error.code === 'CONFIG_LOCK_TIMEOUT'
          ? 'conflict'
          : 'configuration',
    message: error.message,
    details: error.details,
    retryable: error.code === 'CONFIG_LOCK_TIMEOUT',
    cause: error,
  });

const mapExecutionError = (error: GraphQLExecutionError): CliError => {
  const authentication =
    error.code === 'AUTH_REQUIRED' || error.code === 'AUTH_EXPIRED';
  const invocation =
    error.code === 'GRAPHQL_OPERATION_NAME_REQUIRED' ||
    error.code === 'GRAPHQL_MUTATION_REQUIRES_APPROVAL';
  return new CliError({
    code: error.code,
    category: authentication
      ? 'authentication'
      : invocation
        ? 'invocation'
        : 'validation',
    message: error.message,
    details: error.details,
    retryable: false,
    cause: error,
  });
};

const clientErrorCategory = (
  error: GraphQLClientError
): 'network' | 'operation' => {
  if (
    error.category === 'http' ||
    error.category === 'network' ||
    error.category === 'timeout'
  ) {
    return 'network';
  }
  return 'operation';
};

const safeGraphQLErrors = (errors: GraphQLError[] | undefined) =>
  errors?.map((error) => ({
    message: error.message,
    ...(error.path === undefined ? {} : { path: error.path }),
    ...(error.locations === undefined ? {} : { locations: error.locations }),
  }));

/**
 * Register variable values beneath secret-bearing keys before the request is
 * sent. Upstream GraphQL errors frequently echo rejected input values inside a
 * plain `message` field, where key-only output redaction cannot identify them.
 */
const registerSensitiveVariableValues = (
  variables: Record<string, unknown> | undefined,
  register: (value: string) => void
): void => {
  if (variables === undefined) return;
  const seen = new WeakSet<object>();

  const visit = (
    value: unknown,
    parentKey: string | undefined,
    inheritedSensitive: boolean
  ): void => {
    const sensitive =
      inheritedSensitive ||
      (parentKey !== undefined && isSensitiveKey(parentKey));
    if (typeof value === 'string') {
      if (sensitive && value.length > 0) register(value);
      return;
    }
    if (typeof value === 'number') {
      if (sensitive && Number.isFinite(value)) register(String(value));
      return;
    }
    if (value === null || typeof value !== 'object') return;
    if (seen.has(value)) return;
    seen.add(value);

    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor !== undefined && 'value' in descriptor) {
        visit(descriptor.value, key, sensitive);
      }
    }
  };

  visit(variables, undefined, false);
};

const graphQLFailure = (
  error: GraphQLClientError,
  options: {
    data: unknown;
    errors?: GraphQLError[];
    status?: number;
  }
): CliError =>
  new CliError({
    code: error.code,
    category: clientErrorCategory(error),
    message: error.message,
    details: redactSecrets({
      ...(options.status === undefined ? {} : { status: options.status }),
      ...(options.data === null ? {} : { partialData: options.data }),
      ...(options.errors === undefined
        ? {}
        : { graphqlErrors: safeGraphQLErrors(options.errors) }),
      ...(error.details === undefined ? {} : { transport: error.details }),
    }),
    retryable: error.retryable,
  });

export function createExecuteCommandDefinition(
  dependencies: ExecuteCommandDependencies
) {
  return defineCommand({
    id: 'execute',
    path: ['execute'],
    summary: 'Execute one raw GraphQL query or mutation.',
    input: ExecuteInputSchema,
    output: ExecuteOutputSchema,
    bindings: [
      {
        property: 'query',
        sources: [{ kind: 'option', name: 'query' }],
        description: 'Inline GraphQL document.',
      },
      {
        property: 'file',
        sources: [{ kind: 'option', name: 'file' }],
        description: 'GraphQL document path, resolved within --cwd.',
      },
      {
        property: 'variables',
        sources: [{ kind: 'option', name: 'variables' }],
        valueType: 'json',
        description: 'GraphQL variables as a JSON object.',
      },
      {
        property: 'contextName',
        sources: [
          { kind: 'option', name: 'context' },
          { kind: 'environment', name: 'CNC_CONTEXT' },
        ],
        conflict: 'first',
        description: 'Target context. CNC_CONTEXT is used when absent.',
      },
      {
        property: 'anonymous',
        sources: [{ kind: 'option', name: 'anonymous', negatable: true }],
        valueType: 'boolean',
        description: 'Execute without stored credentials.',
      },
      {
        property: 'operationName',
        sources: [
          {
            kind: 'option',
            name: 'operation-name',
            deprecatedAliases: ['operationName'],
          },
        ],
        description: 'Operation to select from a multi-operation document.',
      },
      {
        property: 'timeoutMs',
        sources: [
          {
            kind: 'option',
            name: 'timeout-ms',
            deprecatedAliases: ['timeoutMs'],
          },
        ],
        valueType: 'number',
        description: 'Request timeout in milliseconds. Defaults to 30000.',
      },
      {
        property: 'allowMutation',
        sources: [{ kind: 'option', name: 'allow-mutation', negatable: true }],
        valueType: 'boolean',
        description:
          'Allow a mutation when combined with --yes in agent or CI mode.',
      },
    ],
    examples: [
      {
        argv: [
          'execute',
          '--query',
          'query Viewer { viewer { id } }',
          '--context',
          'production',
        ],
      },
      {
        argv: [
          'execute',
          '--file',
          'queries/viewer.graphql',
          '--variables',
          '{"id":"viewer-id"}',
          '--context',
          'production',
        ],
      },
    ],
    lifecycle: 'finite',
    effect: 'write',
    capabilities: { confirmation: true },
    async execute(input, context) {
      registerSensitiveVariableValues(input.variables, (value) =>
        context.registerSensitiveValue(value)
      );

      if ((input.query === undefined) === (input.file === undefined)) {
        throw new CliError({
          code:
            input.query === undefined
              ? 'GRAPHQL_SOURCE_REQUIRED'
              : 'GRAPHQL_SOURCE_AMBIGUOUS',
          category: 'invocation',
          message:
            input.query === undefined
              ? 'Provide exactly one of --query or --file.'
              : '--query and --file cannot be used together.',
          retryable: false,
        });
      }

      const query =
        input.query ?? (await loadQueryFile(context.cwd, input.file!));
      let analysis;
      const guardedMode = context.mode !== 'human';
      try {
        analysis = analyzeGraphQLDocument(query, input.operationName);
        assertMutationAllowed(analysis, {
          agent: guardedMode,
          allowMutation: input.allowMutation === true,
          yes: context.capabilities.yes,
        });
      } catch (error) {
        if (error instanceof GraphQLExecutionError) {
          throw mapExecutionError(error);
        }
        throw error;
      }

      let executionContext;
      try {
        executionContext = await getExecutionContext({
          contextName: input.contextName,
          env: context.env,
          agent: guardedMode,
          allowCurrentContext: context.mode === 'human',
          anonymous: input.anonymous === true,
          store: dependencies.store,
          now: context.now(),
        });
      } catch (error) {
        if (error instanceof ConfigStoreError) {
          throw mapConfigurationError(error);
        }
        if (error instanceof GraphQLExecutionError) {
          throw mapExecutionError(error);
        }
        throw error;
      }

      if (!executionContext.anonymous) {
        context.registerSensitiveValue(executionContext.token);
      }

      let result;
      try {
        result = await execute(query, input.variables, executionContext, {
          agent: guardedMode,
          allowMutation: input.allowMutation === true,
          yes: context.capabilities.yes,
          operationName: input.operationName,
          signal: context.signal,
          timeoutMs: input.timeoutMs,
          fetch: dependencies.fetch,
          now: context.now(),
        });
      } catch (error) {
        if (error instanceof ConfigStoreError) {
          throw mapConfigurationError(error);
        }
        if (error instanceof GraphQLExecutionError) {
          throw mapExecutionError(error);
        }
        throw error;
      }

      if (!result.ok) {
        if (
          result.error?.code === 'GRAPHQL_CANCELLED' &&
          context.signal.aborted
        ) {
          throw (
            context.signal.reason ??
            new DOMException('The operation was cancelled.', 'AbortError')
          );
        }
        throw graphQLFailure(
          result.error ?? {
            code: 'GRAPHQL_RESPONSE_ERROR',
            category: 'graphql',
            message: 'GraphQL operation failed.',
            retryable: false,
          },
          {
            data: result.data,
            errors: result.errors,
            status: result.status,
          }
        );
      }

      return {
        data: {
          contextName: executionContext.context.name,
          endpoint: executionContext.context.endpoint,
          anonymous: executionContext.anonymous,
          operation: {
            type: analysis.type,
            ...(analysis.name === undefined ? {} : { name: analysis.name }),
          },
          ...(result.status === undefined ? {} : { status: result.status }),
          data: result.data,
        },
      };
    },
  });
}

export const createExecuteHooks = (
  prompter: Inquirerer
): CommandAdapterHookMap => ({
  execute: {
    collectInteractiveInput: async (input) => {
      const candidate = input as Record<string, unknown>;
      if (candidate.query !== undefined || candidate.file !== undefined) {
        return candidate as never;
      }
      return (await prompter.prompt(candidate, [
        {
          type: 'text',
          name: 'query',
          message: 'GraphQL query',
          required: true,
        },
      ])) as never;
    },
    renderHuman: (result) =>
      JSON.stringify((result.data as { data: unknown }).data, null, 2),
  },
});
