/** Raw GraphQL operation analysis, safety gates, and configured execution. */

import {
  Kind,
  type OperationDefinitionNode,
  OperationTypeNode,
  parse,
} from 'graphql';

import {
  type ConfigStore,
  ConfigStoreError,
  type ContextConfig,
  type EnvironmentMap,
  getDefaultConfigStore,
  resolveContextFromState,
} from '../config';
import {
  executeGraphQL,
  type FetchImplementation,
  type QueryResult,
} from './client';

export type GraphQLExecutionErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_EXPIRED'
  | 'GRAPHQL_DOCUMENT_INVALID'
  | 'GRAPHQL_OPERATION_NOT_FOUND'
  | 'GRAPHQL_OPERATION_NAME_REQUIRED'
  | 'GRAPHQL_SUBSCRIPTION_UNSUPPORTED'
  | 'GRAPHQL_MUTATION_REQUIRES_APPROVAL';

export class GraphQLExecutionError extends Error {
  readonly name = 'GraphQLExecutionError';

  constructor(
    readonly code: GraphQLExecutionErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
    options?: { cause?: unknown }
  ) {
    super(message, options);
  }
}

export type ExecutionContext =
  | { context: ContextConfig; token: string; anonymous: false }
  | { context: ContextConfig; token?: undefined; anonymous: true };

export interface ExecutionContextOptions {
  contextName?: string;
  env?: EnvironmentMap;
  agent?: boolean;
  allowCurrentContext?: boolean;
  anonymous?: boolean;
  store?: ConfigStore;
  now?: Date;
}

export interface GraphQLOperationAnalysis {
  type: 'query' | 'mutation';
  name?: string;
  operationCount: number;
}

export interface MutationGateOptions {
  agent?: boolean;
  allowMutation?: boolean;
  yes?: boolean;
}

export interface ExecuteOptions extends MutationGateOptions {
  contextName?: string;
  env?: EnvironmentMap;
  allowCurrentContext?: boolean;
  anonymous?: boolean;
  operationName?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  headers?: Record<string, string>;
  fetch?: FetchImplementation;
  store?: ConfigStore;
  now?: Date;
}

function operationsFromDocument(query: string): OperationDefinitionNode[] {
  let document;
  try {
    document = parse(query);
  } catch (cause) {
    throw new GraphQLExecutionError(
      'GRAPHQL_DOCUMENT_INVALID',
      'GraphQL document could not be parsed.',
      undefined,
      { cause }
    );
  }
  return document.definitions.filter(
    (definition): definition is OperationDefinitionNode =>
      definition.kind === Kind.OPERATION_DEFINITION
  );
}

/** Parse and select one executable query or mutation. */
export function analyzeGraphQLDocument(
  query: string,
  operationName?: string
): GraphQLOperationAnalysis {
  const operations = operationsFromDocument(query);
  if (operations.length === 0) {
    throw new GraphQLExecutionError(
      'GRAPHQL_OPERATION_NOT_FOUND',
      'GraphQL document does not contain an executable operation.'
    );
  }

  let selected: OperationDefinitionNode | undefined;
  if (operationName) {
    selected = operations.find(
      (operation) => operation.name?.value === operationName
    );
    if (!selected) {
      throw new GraphQLExecutionError(
        'GRAPHQL_OPERATION_NOT_FOUND',
        `GraphQL operation "${operationName}" was not found.`,
        {
          operationName,
          availableOperations: operations
            .map((operation) => operation.name?.value)
            .filter((name): name is string => Boolean(name)),
        }
      );
    }
  } else if (operations.length > 1) {
    throw new GraphQLExecutionError(
      'GRAPHQL_OPERATION_NAME_REQUIRED',
      'GraphQL document contains multiple operations; operationName is required.',
      {
        availableOperations: operations
          .map((operation) => operation.name?.value)
          .filter((name): name is string => Boolean(name)),
      }
    );
  } else {
    selected = operations[0];
  }

  if (selected.operation === OperationTypeNode.SUBSCRIPTION) {
    throw new GraphQLExecutionError(
      'GRAPHQL_SUBSCRIPTION_UNSUPPORTED',
      'Raw execution does not support GraphQL subscriptions.'
    );
  }
  return {
    type:
      selected.operation === OperationTypeNode.MUTATION ? 'mutation' : 'query',
    name: selected.name?.value,
    operationCount: operations.length,
  };
}

/** Require both explicit capabilities before an agent executes a mutation. */
export function assertMutationAllowed(
  operation: GraphQLOperationAnalysis,
  options: MutationGateOptions
): void {
  if (
    options.agent &&
    operation.type === 'mutation' &&
    (!options.allowMutation || !options.yes)
  ) {
    throw new GraphQLExecutionError(
      'GRAPHQL_MUTATION_REQUIRES_APPROVAL',
      'Agent mutation execution requires both --allow-mutation and --yes.',
      {
        allowMutation: options.allowMutation === true,
        confirmed: options.yes === true,
      }
    );
  }
}

/** Resolve an endpoint and optional stored credentials without reading env. */
export async function getExecutionContext(
  contextNameOrOptions?: string | ExecutionContextOptions
): Promise<ExecutionContext> {
  const options: ExecutionContextOptions =
    typeof contextNameOrOptions === 'string'
      ? { contextName: contextNameOrOptions }
      : (contextNameOrOptions ?? {});
  const store = options.store ?? getDefaultConfigStore();
  const state = store.read();
  const resolved = resolveContextFromState(state, {
    contextName: options.contextName,
    env: options.env,
    allowCurrentContext: options.allowCurrentContext ?? !options.agent,
  });

  if (options.anonymous) {
    return { context: resolved.context, anonymous: true };
  }
  const credentials = state.credentials.tokens[resolved.context.name];
  if (!credentials?.token) {
    throw new GraphQLExecutionError(
      'AUTH_REQUIRED',
      `No credentials are configured for context "${resolved.context.name}".`,
      { contextName: resolved.context.name }
    );
  }
  if (
    credentials.expiresAt &&
    new Date(credentials.expiresAt) <= (options.now ?? new Date())
  ) {
    throw new GraphQLExecutionError(
      'AUTH_EXPIRED',
      `Credentials for context "${resolved.context.name}" have expired.`,
      { contextName: resolved.context.name, expiresAt: credentials.expiresAt }
    );
  }
  return {
    context: resolved.context,
    token: credentials.token,
    anonymous: false,
  };
}

/** Execute one selected raw GraphQL query or mutation. */
export async function execute<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  executionContext?: ExecutionContext,
  options: ExecuteOptions = {}
): Promise<QueryResult<T>> {
  const operation = analyzeGraphQLDocument(query, options.operationName);
  assertMutationAllowed(operation, options);
  const context =
    executionContext ??
    (await getExecutionContext({
      contextName: options.contextName,
      env: options.env,
      agent: options.agent,
      allowCurrentContext: options.allowCurrentContext,
      anonymous: options.anonymous,
      store: options.store,
      now: options.now,
    }));
  if (!context.anonymous && !context.token) {
    throw new GraphQLExecutionError(
      'AUTH_REQUIRED',
      `No credentials are configured for context "${context.context.name}".`,
      { contextName: context.context.name }
    );
  }
  const requestHeaders = Object.fromEntries(
    Object.entries(options.headers ?? {}).filter(
      ([name]) => name.toLowerCase() !== 'authorization'
    )
  );
  const authorization =
    context.anonymous || !context.token
      ? {}
      : { Authorization: `Bearer ${context.token}` };

  return executeGraphQL<T>(
    context.context.endpoint,
    query,
    variables,
    { ...requestHeaders, ...authorization },
    {
      operationName: operation.name,
      signal: options.signal,
      timeoutMs: options.timeoutMs,
      fetch: options.fetch,
    }
  );
}

// ConfigStoreError remains part of the executor's typed failure surface.
export { ConfigStoreError };
