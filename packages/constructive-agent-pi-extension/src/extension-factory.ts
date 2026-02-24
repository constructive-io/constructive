import { Type, type TSchema } from '@sinclair/typebox';

import {
  DEFAULT_CAPABILITY_POLICY,
  DEFAULT_REDACTION_CONFIG,
  FetchGraphQLExecutor,
  GraphQLOperationRegistry,
  StaticPolicyEngine,
  createGraphQLHeaders,
  redactValue,
  registerOperationBundle,
  type AgentRunRecord,
  type AgentToolDefinition,
  type CapabilityTag,
  type GraphQLExecutor,
  type GraphQLOperationBundle,
  type GraphQLOperationDefinition,
  type PolicyDecision,
  type PolicyEngine,
  type RedactionConfig,
  type ToolRiskClass,
} from '@constructive-io/constructive-agent';
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
  ExtensionFactory,
  ToolDefinition,
} from '@mariozechner/pi-coding-agent';

import {
  DEFAULT_EXPLORE_TTL_MS,
  ensureOrmCatalog,
  summarizeExploreFailure,
} from './explore-service';
import {
  executeOrmDispatcherCall,
  normalizeOrmToolArgs,
  type OrmInputValidationMode,
  validateOrmToolInput,
} from './orm-dispatcher';
import {
  readActiveCatalogPointer,
  readOrmAgentCatalog,
  resolveExploreCacheRoot,
  type OrmCatalogTool,
  type OrmSelectPolicy,
} from './orm-catalog';

const DEFAULT_ENDPOINT_ENV_VAR = 'CONSTRUCTIVE_GRAPHQL_ENDPOINT';
const DEFAULT_ACCESS_TOKEN_ENV_VAR = 'CONSTRUCTIVE_ACCESS_TOKEN';
const DEFAULT_ACTOR_ID_ENV_VAR = 'CONSTRUCTIVE_ACTOR_ID';
const DEFAULT_TENANT_ID_ENV_VAR = 'CONSTRUCTIVE_TENANT_ID';
const DEFAULT_DATABASE_ID_ENV_VAR = 'CONSTRUCTIVE_DATABASE_ID';
const DEFAULT_API_NAME_ENV_VAR = 'CONSTRUCTIVE_API_NAME';
const DEFAULT_META_SCHEMA_ENV_VAR = 'CONSTRUCTIVE_META_SCHEMA';
const DEFAULT_ORIGIN_ENV_VAR = 'CONSTRUCTIVE_ORIGIN';
const DEFAULT_USER_AGENT_ENV_VAR = 'CONSTRUCTIVE_USER_AGENT';

const DEFAULT_COMMAND_PREFIX = 'constructive';
const DEFAULT_EMPTY_PARAMETERS = Type.Object({}, { additionalProperties: true });
const DEFAULT_ORM_DISPATCHER_TOOL_NAME = 'constructive_orm_call';
const DEFAULT_EXPLORE_COMMAND_SUFFIX = 'explore';
const DEFAULT_CAPABILITIES_COMMAND_SUFFIX = 'capabilities';
const DEFAULT_EXPLORE_FORCE_FLAG = '--refresh';
const DEFAULT_ORM_SELECT_POLICY: OrmSelectPolicy = 'auto-minimal';

const ORM_DISPATCHER_PARAMETERS = Type.Object(
  {
    tool: Type.String({
      description: 'Catalog tool name (for example: orm_project_findMany)',
    }),
    args: Type.Optional(
      Type.Object({}, { additionalProperties: true, description: 'Arguments for selected ORM tool' }),
    ),
    select: Type.Optional(
      Type.Object({}, { additionalProperties: true, description: 'Optional select object to override default selection' }),
    ),
    dryRun: Type.Optional(
      Type.Boolean({
        description: 'If true, return the resolved ORM invocation without executing it',
      }),
    ),
  },
  { additionalProperties: false },
);

const HEALTH_CHECK_DOCUMENT = `
  query ConstructivePiHealthCheck {
    __typename
  }
`;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const safeJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const maskToken = (token: string): string => {
  if (token.length <= 8) {
    return '********';
  }

  return `${token.slice(0, 4)}...${token.slice(-4)}`;
};

const parseCommandTokens = (input: string): string[] => {
  const normalized = normalizeString(input);
  if (!normalized) {
    return [];
  }

  return normalized.split(/\s+/).filter((entry) => entry.length > 0);
};

const toCatalogToolLookupName = (value: string): string => {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};

const looksLikeCapabilityDiscovery = (toolName: string): boolean => {
  const normalized = toCatalogToolLookupName(toolName);
  return (
    normalized.includes('toollist') ||
    normalized.includes('listtools') ||
    normalized.includes('capabilities') ||
    normalized.includes('cataloglist') ||
    normalized.includes('schema')
  );
};

const commonPrefixLength = (left: string, right: string): number => {
  const max = Math.min(left.length, right.length);
  let index = 0;
  while (index < max && left[index] === right[index]) {
    index += 1;
  }
  return index;
};

const scoreToolSuggestion = (candidate: string, input: string): number => {
  const name = candidate.toLowerCase();
  const query = input.toLowerCase();
  if (!query) {
    return 0;
  }

  let score = 0;
  if (name === query) {
    score += 1000;
  }
  if (name.startsWith(query)) {
    score += 200;
  }
  if (name.includes(query)) {
    score += 120;
  }

  const normalizedQuery = query.startsWith('orm_') ? query.slice(4) : query;
  if (normalizedQuery && name.includes(normalizedQuery)) {
    score += 80;
  }

  const tokens = normalizedQuery.split(/[_\-]/g).filter((entry) => entry.length >= 2);
  for (const token of tokens) {
    if (name.includes(token)) {
      score += 16;
    }
  }

  score += Math.min(commonPrefixLength(name, query), 8);
  return score;
};

const getToolSuggestions = (
  toolName: string,
  tools: OrmCatalogTool[],
  limit: number = 8,
): string[] => {
  const ranked = tools
    .map((entry) => ({
      name: entry.name,
      score: scoreToolSuggestion(entry.name, toolName),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  if (ranked.length > 0) {
    return ranked.slice(0, limit).map((entry) => entry.name);
  }

  return tools.slice(0, limit).map((entry) => entry.name);
};

const buildUnknownToolError = (
  options: CreateConstructivePiExtensionOptions,
  selectedToolName: string,
  tools: OrmCatalogTool[],
): string => {
  const suggestions = getToolSuggestions(selectedToolName, tools);
  const capabilitiesCommand = `/${getCapabilitiesCommandName(options)} --json`;
  const lines = [`Unknown catalog tool "${selectedToolName}".`];

  if (looksLikeCapabilityDiscovery(selectedToolName)) {
    lines.push(
      `Tool discovery is exposed via command ${capabilitiesCommand}, not via constructive_orm_call.`,
    );
  } else {
    lines.push(`Run ${capabilitiesCommand} to list the active catalog tools.`);
  }

  if (suggestions.length > 0) {
    lines.push(`Did you mean: ${suggestions.join(', ')}`);
  }

  return lines.join('\n');
};

const createApprovalPrompt = (
  operation: ConstructivePiOperation,
  decision: PolicyDecision,
  redactedArgs: Record<string, unknown>,
): ConstructiveApprovalPrompt => {
  return {
    title: `Approve ${operation.label}?`,
    message: [
      `Tool: ${operation.toolName}`,
      `Capability: ${operation.capability}`,
      `Risk: ${decision.riskClass}`,
      `Reason: ${decision.reason}`,
      'Arguments:',
      safeJson(redactedArgs),
    ].join('\n'),
  };
};

const defaultToolResultFormatter: ConstructiveResultFormatter = (
  result,
): string => {
  if (typeof result === 'string') {
    return result;
  }

  return safeJson(result);
};

const getSessionId = (context: ExtensionContext): string => {
  return context.sessionManager.getSessionId();
};

const emitInfo = (
  context: ExtensionCommandContext,
  message: string,
  type: 'info' | 'warning' | 'error' = 'info',
): void => {
  if (context.hasUI) {
    context.ui.notify(message, type);
  }
};

type MaybePromise<TValue> = TValue | Promise<TValue>;

export type ConstructiveStringResolver = (
  context: ExtensionContext,
  operation: ConstructivePiOperation,
  args: Record<string, unknown>,
) => MaybePromise<string | undefined>;

export type ConstructiveHeadersResolver = (
  context: ExtensionContext,
  operation: ConstructivePiOperation,
  args: Record<string, unknown>,
) => MaybePromise<Record<string, string> | undefined>;

export type ConstructiveMetadataResolver = (
  context: ExtensionContext,
  operation: ConstructivePiOperation,
  args: Record<string, unknown>,
) => MaybePromise<Record<string, unknown> | undefined>;

export type ConstructiveResultFormatter = (
  result: unknown,
  context: {
    operation: ConstructivePiOperation;
    args: Record<string, unknown>;
  },
) => string;

export interface ConstructiveApprovalPrompt {
  title: string;
  message: string;
}

export type ConstructiveApprovalPromptBuilder = (
  context: {
    operation: ConstructivePiOperation;
    decision: PolicyDecision;
    argsRedacted: Record<string, unknown>;
  },
) => MaybePromise<ConstructiveApprovalPrompt>;

export interface ConstructivePiOperation<
  TArgs = Record<string, unknown>,
> extends GraphQLOperationDefinition<TArgs> {
  parameters?: TSchema;
}

export interface ConstructiveExploreOptions {
  enabled?: boolean;
  cacheDir?: string;
  ttlMs?: number;
  commandName?: string;
  forceRefreshArg?: string;
}

export interface ConstructiveOrmDispatcherOptions {
  enabled?: boolean;
  toolName?: string;
  strict?: boolean;
  selectPolicy?: OrmSelectPolicy;
  validationMode?: OrmInputValidationMode;
}

export interface ConstructiveCodegenOptions {
  outputDir?: string;
  docs?: {
    agents?: boolean;
    mcp?: boolean;
    skills?: boolean;
  };
}

export interface CreateConstructivePiExtensionOptions {
  operations?: ConstructivePiOperation<any>[];
  operationBundles?: GraphQLOperationBundle[];
  operationRegistry?: GraphQLOperationRegistry;
  operationSchemas?: Record<string, TSchema>;
  includeHealthCheckTool?: boolean;

  endpoint?: string;
  endpointEnvVar?: string;
  resolveEndpoint?: ConstructiveStringResolver;

  accessToken?: string;
  accessTokenEnvVar?: string;
  resolveAccessToken?: ConstructiveStringResolver;

  actorId?: string;
  actorIdEnvVar?: string;
  resolveActorId?: ConstructiveStringResolver;

  tenantId?: string;
  tenantIdEnvVar?: string;
  resolveTenantId?: ConstructiveStringResolver;

  databaseId?: string;
  databaseIdEnvVar?: string;
  resolveDatabaseId?: ConstructiveStringResolver;

  apiName?: string;
  apiNameEnvVar?: string;
  resolveApiName?: ConstructiveStringResolver;

  metaSchema?: string;
  metaSchemaEnvVar?: string;
  resolveMetaSchema?: ConstructiveStringResolver;

  origin?: string;
  originEnvVar?: string;
  resolveOrigin?: ConstructiveStringResolver;

  userAgent?: string;
  userAgentEnvVar?: string;
  resolveUserAgent?: ConstructiveStringResolver;

  extraHeaders?: Record<string, string>;
  resolveExtraHeaders?: ConstructiveHeadersResolver;

  resolveRunMetadata?: ConstructiveMetadataResolver;

  policyEngine?: PolicyEngine;
  redactionConfig?: RedactionConfig;
  executor?: GraphQLExecutor;

  nonInteractiveApproval?: 'allow' | 'deny';
  approvalPromptBuilder?: ConstructiveApprovalPromptBuilder;

  resultFormatter?: ConstructiveResultFormatter;

  enableCommands?: boolean;
  enableAuthSetCommand?: boolean;
  commandPrefix?: string;

  explore?: ConstructiveExploreOptions;
  ormDispatcher?: ConstructiveOrmDispatcherOptions;
  codegen?: ConstructiveCodegenOptions;
  legacyDocumentTools?: boolean;
}

export interface ConstructiveToolDetails {
  data: unknown;
  invocation?: unknown;
  operation: string;
  capability: CapabilityTag;
  riskClass: ToolRiskClass;
  policyDecision: PolicyDecision;
  endpoint: string;
  tokenSource: ConstructiveTokenSource;
}

export type ConstructiveTokenSource =
  | 'session'
  | 'resolver'
  | 'explicit'
  | 'env'
  | 'missing';

interface ConstructiveResolvedToken {
  token?: string;
  source: ConstructiveTokenSource;
}

interface ConstructiveExtensionState {
  readonly sessionTokens: Map<string, string>;
}

interface ConstructiveRuntimeSnapshot {
  sessionId: string;
  endpoint?: string;
  actorId: string;
  tenantId?: string;
  tokenSource: ConstructiveTokenSource;
  tokenMasked?: string;
}

interface ConstructiveResolvedExecutionContext {
  sessionId: string;
  actorId: string;
  tenantId?: string;
  endpoint: string;
  databaseId?: string;
  apiName?: string;
  metaSchema?: string;
  origin?: string;
  userAgent?: string;
  resolvedToken: ConstructiveResolvedToken;
  headers: Record<string, string>;
}

const NOOP_EXECUTE: AgentToolDefinition['execute'] = async () => {
  return {
    content: null,
  };
};

const DEFAULT_HEALTH_CHECK_OPERATION: ConstructivePiOperation = {
  toolName: 'constructive_graphql_health_check',
  label: 'Constructive GraphQL Health Check',
  description:
    'Checks Constructive GraphQL endpoint availability via __typename.',
  capability: 'read',
  riskClass: 'read_only',
  document: HEALTH_CHECK_DOCUMENT,
  parameters: Type.Object({}, { additionalProperties: false }),
};

const resolveStringValue = async (
  options: {
    explicit?: string;
    resolver?: ConstructiveStringResolver;
    envVar?: string;
  },
  context: ExtensionContext,
  operation: ConstructivePiOperation,
  args: Record<string, unknown>,
): Promise<string | undefined> => {
  const resolved = normalizeString(
    options.resolver
      ? await options.resolver(context, operation, args)
      : undefined,
  );

  if (resolved) {
    return resolved;
  }

  const explicitValue = normalizeString(options.explicit);
  if (explicitValue) {
    return explicitValue;
  }

  const envVar = normalizeString(options.envVar);
  if (!envVar) {
    return undefined;
  }

  return normalizeString(process.env[envVar]);
};

const stripParameters = <TArgs>(
  operation: ConstructivePiOperation<TArgs>,
): GraphQLOperationDefinition<TArgs> => {
  const { parameters: _parameters, ...definition } = operation;
  return definition;
};

const buildOperations = (
  options: CreateConstructivePiExtensionOptions,
): ConstructivePiOperation<any>[] => {
  const registry = new GraphQLOperationRegistry();
  const schemas = new Map<string, TSchema>();

  if (options.operationRegistry) {
    for (const operation of options.operationRegistry.list()) {
      registry.register(operation);
    }
  }

  if (options.operationBundles) {
    for (const bundle of options.operationBundles) {
      registerOperationBundle(registry, bundle);
    }
  }

  if (options.operations) {
    for (const operation of options.operations) {
      registry.register(stripParameters(operation));
      if (operation.parameters) {
        schemas.set(operation.toolName, operation.parameters);
      }
    }
  }

  if (options.operationSchemas) {
    for (const [toolName, schema] of Object.entries(options.operationSchemas)) {
      schemas.set(toolName, schema);
    }
  }

  const includeHealthCheck = options.includeHealthCheckTool !== false;
  if (
    includeHealthCheck &&
    !registry.get(DEFAULT_HEALTH_CHECK_OPERATION.toolName)
  ) {
    registry.register(stripParameters(DEFAULT_HEALTH_CHECK_OPERATION));
    if (DEFAULT_HEALTH_CHECK_OPERATION.parameters) {
      schemas.set(
        DEFAULT_HEALTH_CHECK_OPERATION.toolName,
        DEFAULT_HEALTH_CHECK_OPERATION.parameters,
      );
    }
  }

  return registry.list().map((operation) => {
    return {
      ...operation,
      parameters: schemas.get(operation.toolName),
    };
  });
};

const resolveAccessToken = async (
  options: CreateConstructivePiExtensionOptions,
  state: ConstructiveExtensionState,
  context: ExtensionContext,
  operation: ConstructivePiOperation,
  args: Record<string, unknown>,
): Promise<ConstructiveResolvedToken> => {
  const sessionToken = state.sessionTokens.get(getSessionId(context));
  if (sessionToken) {
    return {
      token: sessionToken,
      source: 'session',
    };
  }

  const resolverToken = await resolveStringValue(
    {
      resolver: options.resolveAccessToken,
    },
    context,
    operation,
    args,
  );

  if (resolverToken) {
    return {
      token: resolverToken,
      source: 'resolver',
    };
  }

  const explicitToken = normalizeString(options.accessToken);
  if (explicitToken) {
    return {
      token: explicitToken,
      source: 'explicit',
    };
  }

  const envVar = options.accessTokenEnvVar || DEFAULT_ACCESS_TOKEN_ENV_VAR;
  const envToken = normalizeString(process.env[envVar]);
  if (envToken) {
    return {
      token: envToken,
      source: 'env',
    };
  }

  return {
    source: 'missing',
  };
};

const resolveRuntimeSnapshot = async (
  options: CreateConstructivePiExtensionOptions,
  state: ConstructiveExtensionState,
  context: ExtensionContext,
  operation: ConstructivePiOperation,
): Promise<ConstructiveRuntimeSnapshot> => {
  const args: Record<string, unknown> = {};

  const endpoint = await resolveStringValue(
    {
      explicit: options.endpoint,
      resolver: options.resolveEndpoint,
      envVar: options.endpointEnvVar || DEFAULT_ENDPOINT_ENV_VAR,
    },
    context,
    operation,
    args,
  );

  const actorId =
    (await resolveStringValue(
      {
        explicit: options.actorId,
        resolver: options.resolveActorId,
        envVar: options.actorIdEnvVar || DEFAULT_ACTOR_ID_ENV_VAR,
      },
      context,
      operation,
      args,
    )) || `session:${getSessionId(context)}`;

  const tenantId = await resolveStringValue(
    {
      explicit: options.tenantId,
      resolver: options.resolveTenantId,
      envVar: options.tenantIdEnvVar || DEFAULT_TENANT_ID_ENV_VAR,
    },
    context,
    operation,
    args,
  );

  const resolvedToken = await resolveAccessToken(
    options,
    state,
    context,
    operation,
    args,
  );

  return {
    sessionId: getSessionId(context),
    endpoint,
    actorId,
    tenantId,
    tokenSource: resolvedToken.source,
    tokenMasked: resolvedToken.token
      ? maskToken(resolvedToken.token)
      : undefined,
  };
};

const buildCommandName = (
  prefix: string,
  suffix: string,
): string => {
  const normalizedPrefix =
    normalizeString(prefix)?.replace(/\//g, '') || DEFAULT_COMMAND_PREFIX;
  return `${normalizedPrefix}-${suffix}`;
};

const shouldRegisterLegacyDocumentTools = (
  options: CreateConstructivePiExtensionOptions,
): boolean => {
  if (options.legacyDocumentTools === true) {
    return true;
  }

  if (options.ormDispatcher?.strict === false) {
    return true;
  }

  return false;
};

const getExploreCommandSuffix = (
  options: CreateConstructivePiExtensionOptions,
): string => {
  return normalizeString(options.explore?.commandName) || DEFAULT_EXPLORE_COMMAND_SUFFIX;
};

const getExploreCommandName = (
  options: CreateConstructivePiExtensionOptions,
): string => {
  return buildCommandName(
    options.commandPrefix || DEFAULT_COMMAND_PREFIX,
    getExploreCommandSuffix(options),
  );
};

const getCapabilitiesCommandName = (
  options: CreateConstructivePiExtensionOptions,
): string => {
  return buildCommandName(
    options.commandPrefix || DEFAULT_COMMAND_PREFIX,
    DEFAULT_CAPABILITIES_COMMAND_SUFFIX,
  );
};

const resolveExecutionContext = async (
  options: CreateConstructivePiExtensionOptions,
  state: ConstructiveExtensionState,
  context: ExtensionContext,
  operation: ConstructivePiOperation,
  args: Record<string, unknown>,
): Promise<ConstructiveResolvedExecutionContext> => {
  const sessionId = getSessionId(context);
  const actorId =
    (await resolveStringValue(
      {
        explicit: options.actorId,
        resolver: options.resolveActorId,
        envVar: options.actorIdEnvVar || DEFAULT_ACTOR_ID_ENV_VAR,
      },
      context,
      operation,
      args,
    )) || `session:${sessionId}`;

  const tenantId = await resolveStringValue(
    {
      explicit: options.tenantId,
      resolver: options.resolveTenantId,
      envVar: options.tenantIdEnvVar || DEFAULT_TENANT_ID_ENV_VAR,
    },
    context,
    operation,
    args,
  );

  const endpoint = await resolveStringValue(
    {
      explicit: options.endpoint,
      resolver: options.resolveEndpoint,
      envVar: options.endpointEnvVar || DEFAULT_ENDPOINT_ENV_VAR,
    },
    context,
    operation,
    args,
  );

  if (!endpoint) {
    throw new Error(
      `Missing GraphQL endpoint. Set ${
        options.endpointEnvVar || DEFAULT_ENDPOINT_ENV_VAR
      } or provide endpoint resolver.`,
    );
  }

  const resolvedToken = await resolveAccessToken(
    options,
    state,
    context,
    operation,
    args,
  );

  if (!resolvedToken.token) {
    throw new Error(
      `Missing access token. Set ${
        options.accessTokenEnvVar || DEFAULT_ACCESS_TOKEN_ENV_VAR
      } or use ${buildCommandName(
        options.commandPrefix || DEFAULT_COMMAND_PREFIX,
        'auth-set',
      )}.`,
    );
  }

  const databaseId = await resolveStringValue(
    {
      explicit: options.databaseId,
      resolver: options.resolveDatabaseId,
      envVar: options.databaseIdEnvVar || DEFAULT_DATABASE_ID_ENV_VAR,
    },
    context,
    operation,
    args,
  );

  const apiName = await resolveStringValue(
    {
      explicit: options.apiName,
      resolver: options.resolveApiName,
      envVar: options.apiNameEnvVar || DEFAULT_API_NAME_ENV_VAR,
    },
    context,
    operation,
    args,
  );

  const metaSchema = await resolveStringValue(
    {
      explicit: options.metaSchema,
      resolver: options.resolveMetaSchema,
      envVar: options.metaSchemaEnvVar || DEFAULT_META_SCHEMA_ENV_VAR,
    },
    context,
    operation,
    args,
  );

  const origin = await resolveStringValue(
    {
      explicit: options.origin,
      resolver: options.resolveOrigin,
      envVar: options.originEnvVar || DEFAULT_ORIGIN_ENV_VAR,
    },
    context,
    operation,
    args,
  );

  const userAgent = await resolveStringValue(
    {
      explicit: options.userAgent,
      resolver: options.resolveUserAgent,
      envVar: options.userAgentEnvVar || DEFAULT_USER_AGENT_ENV_VAR,
    },
    context,
    operation,
    args,
  );

  const resolvedExtraHeaders =
    (await options.resolveExtraHeaders?.(context, operation, args)) || {};

  const headers = createGraphQLHeaders(
    {
      actorId,
      tenantId,
      accessToken: resolvedToken.token,
      graphqlEndpoint: endpoint,
      databaseId,
      apiName,
      metaSchema,
      origin,
      userAgent,
    },
    {
      ...(options.extraHeaders || {}),
      ...resolvedExtraHeaders,
    },
  );

  return {
    sessionId,
    actorId,
    tenantId,
    endpoint,
    databaseId,
    apiName,
    metaSchema,
    origin,
    userAgent,
    resolvedToken,
    headers,
  };
};

const enforcePolicy = async (
  options: CreateConstructivePiExtensionOptions,
  context: ExtensionContext,
  operation: ConstructivePiOperation,
  args: Record<string, unknown>,
  executionContext: ConstructiveResolvedExecutionContext,
): Promise<PolicyDecision> => {
  const policyEngine =
    options.policyEngine ||
    new StaticPolicyEngine(DEFAULT_CAPABILITY_POLICY, {
      action: 'deny',
      reason: 'No matching policy rule for capability.',
      riskClass: 'high',
    });

  const runMetadata = await options.resolveRunMetadata?.(context, operation, args);

  const run: AgentRunRecord = {
    id: `${executionContext.sessionId}:${operation.toolName}`,
    status: 'running',
    actorId: executionContext.actorId,
    tenantId: executionContext.tenantId,
    modelProvider: context.model?.provider || 'unknown',
    modelName: context.model?.id || 'unknown',
    startedAt: Date.now(),
    metadata: runMetadata,
  };

  const policyTool: AgentToolDefinition = {
    name: operation.toolName,
    label: operation.label,
    description: operation.description,
    capability: operation.capability,
    riskClass: operation.riskClass,
    execute: NOOP_EXECUTE,
  };

  const decision = await policyEngine.evaluate({
    run,
    tool: policyTool,
    invocation: {
      toolName: operation.toolName,
      args,
    },
  });

  if (decision.action === 'deny') {
    throw new Error(`Policy denied ${operation.toolName}: ${decision.reason}`);
  }

  if (decision.action === 'needs_approval') {
    const redactionConfig = options.redactionConfig || DEFAULT_REDACTION_CONFIG;
    const redactedArgs = (redactValue(args, redactionConfig) || {}) as Record<
      string,
      unknown
    >;

    const approvalPromptBuilder =
      options.approvalPromptBuilder ||
      (async (approvalContext) =>
        createApprovalPrompt(
          approvalContext.operation,
          approvalContext.decision,
          approvalContext.argsRedacted,
        ));

    let approved = false;
    if (context.hasUI) {
      const approvalPrompt = await approvalPromptBuilder({
        operation,
        decision,
        argsRedacted: redactedArgs,
      });
      approved = await context.ui.confirm(
        approvalPrompt.title,
        approvalPrompt.message,
      );
    } else {
      approved = options.nonInteractiveApproval === 'allow';
    }

    if (!approved) {
      throw new Error(`Approval denied for ${operation.toolName}: ${decision.reason}`);
    }
  }

  return decision;
};

const resolveActiveCatalog = (
  options: CreateConstructivePiExtensionOptions,
  context: ExtensionContext,
): {
  cacheRoot: string;
  catalogPath: string;
  ormIndexPath: string;
  tools: OrmCatalogTool[];
} => {
  const cacheRoot = resolveExploreCacheRoot(context.cwd, options.explore?.cacheDir);
  const pointer = readActiveCatalogPointer(cacheRoot);

  if (!pointer) {
    throw new Error(
      `No active ORM catalog found. Run /${getExploreCommandName(options)} first.`,
    );
  }

  const catalog = readOrmAgentCatalog(pointer.catalogPath);
  if (!catalog) {
    throw new Error(
      `Active ORM catalog is missing or invalid at ${pointer.catalogPath}. Run /${getExploreCommandName(
        options,
      )} --refresh.`,
    );
  }

  return {
    cacheRoot,
    catalogPath: pointer.catalogPath,
    ormIndexPath: pointer.ormIndexPath,
    tools: catalog.tools,
  };
};

const createDispatcherOperation = (
  ormTool: OrmCatalogTool,
): ConstructivePiOperation => {
  return {
    toolName: ormTool.name,
    label: ormTool.name,
    description: ormTool.description,
    capability: ormTool._meta.policy.capability as CapabilityTag,
    riskClass: ormTool._meta.policy.riskClass as ToolRiskClass,
    document: HEALTH_CHECK_DOCUMENT,
  };
};

const toLegacyToolDefinition = (
  operation: ConstructivePiOperation,
  options: CreateConstructivePiExtensionOptions,
  state: ConstructiveExtensionState,
): ToolDefinition => {
  const executor = options.executor || new FetchGraphQLExecutor();
  const formatter = options.resultFormatter || defaultToolResultFormatter;

  return {
    name: operation.toolName,
    label: operation.label,
    description: operation.description,
    parameters: operation.parameters || DEFAULT_EMPTY_PARAMETERS,
    execute: async (_toolCallId, params, signal, _onUpdate, context) => {
      const args = isRecord(params) ? params : {};

      const executionContext = await resolveExecutionContext(
        options,
        state,
        context,
        operation,
        args,
      );

      const decision = await enforcePolicy(
        options,
        context,
        operation,
        args,
        executionContext,
      );

      const variables = operation.mapVariables
        ? operation.mapVariables(args)
        : args;

      const result = await executor.execute({
        endpoint: executionContext.endpoint,
        document: operation.document,
        variables,
        headers: executionContext.headers,
        signal,
      });

      if (!result.ok) {
        const message =
          result.errors?.map((error) => error.message).join('; ') ||
          'GraphQL execution failed';
        throw new Error(message);
      }

      return {
        content: [
          {
            type: 'text',
            text: formatter(result.data, {
              operation,
              args,
            }),
          },
        ],
        details: {
          data: result.data,
          operation: operation.toolName,
          capability: operation.capability,
          riskClass: decision.riskClass,
          policyDecision: decision,
          endpoint: executionContext.endpoint,
          tokenSource: executionContext.resolvedToken.source,
        } satisfies ConstructiveToolDetails,
      };
    },
  };
};

const toOrmDispatcherToolDefinition = (
  options: CreateConstructivePiExtensionOptions,
  state: ConstructiveExtensionState,
): ToolDefinition => {
  const formatter = options.resultFormatter || defaultToolResultFormatter;
  const toolName =
    normalizeString(options.ormDispatcher?.toolName) ||
    DEFAULT_ORM_DISPATCHER_TOOL_NAME;
  const selectPolicy =
    options.ormDispatcher?.selectPolicy || DEFAULT_ORM_SELECT_POLICY;
  const validationMode = options.ormDispatcher?.validationMode || 'permissive';

  return {
    name: toolName,
    label: 'Constructive ORM Dispatcher',
    description:
      'Dispatches typed ORM operations from the active /constructive-explore catalog.',
    parameters: ORM_DISPATCHER_PARAMETERS,
    execute: async (_toolCallId, params, _signal, _onUpdate, context) => {
      const payload = isRecord(params) ? params : {};
      const selectedToolName = normalizeString(payload.tool);
      if (!selectedToolName) {
        throw new Error('Missing required dispatcher parameter: tool');
      }

      const providedArgs = isRecord(payload.args) ? payload.args : {};
      const select = isRecord(payload.select) ? payload.select : undefined;
      const dryRun = payload.dryRun === true;

      const activeCatalog = resolveActiveCatalog(options, context);
      const selectedTool = activeCatalog.tools.find(
        (entry) => entry.name === selectedToolName,
      );

      if (!selectedTool) {
        throw new Error(
          buildUnknownToolError(options, selectedToolName, activeCatalog.tools),
        );
      }

      const dispatcherArgs = normalizeOrmToolArgs(selectedTool, providedArgs);
      const validationErrors = validateOrmToolInput(selectedTool, dispatcherArgs, {
        mode: validationMode,
      });
      if (validationErrors.length > 0) {
        throw new Error(
          `Invalid input for ${selectedTool.name}:\n${validationErrors.join('\n')}`,
        );
      }

      const operation = createDispatcherOperation(selectedTool);
      const executionContext = await resolveExecutionContext(
        options,
        state,
        context,
        operation,
        dispatcherArgs,
      );

      const decision = await enforcePolicy(
        options,
        context,
        operation,
        dispatcherArgs,
        executionContext,
      );

      const execution = await executeOrmDispatcherCall({
        ormIndexPath: activeCatalog.ormIndexPath,
        endpoint: executionContext.endpoint,
        headers: executionContext.headers,
        tool: selectedTool,
        args: dispatcherArgs,
        select,
        selectPolicy,
        dryRun,
      });

      return {
        content: [
          {
            type: 'text',
            text: formatter(execution.data, {
              operation,
              args: dispatcherArgs,
            }),
          },
        ],
        details: {
          data: execution.data,
          invocation: execution.invocation,
          operation: selectedTool.name,
          capability: operation.capability,
          riskClass: decision.riskClass,
          policyDecision: decision,
          endpoint: executionContext.endpoint,
          tokenSource: executionContext.resolvedToken.source,
        } satisfies ConstructiveToolDetails,
      };
    },
  };
};

const registerCommands = (
  api: ExtensionAPI,
  options: CreateConstructivePiExtensionOptions,
  operations: ConstructivePiOperation[],
  state: ConstructiveExtensionState,
  registeredToolCount: number,
): void => {
  if (options.enableCommands === false) {
    return;
  }

  const commandPrefix = options.commandPrefix || DEFAULT_COMMAND_PREFIX;
  const referenceOperation = operations[0] || DEFAULT_HEALTH_CHECK_OPERATION;

  api.registerCommand(buildCommandName(commandPrefix, 'status'), {
    description:
      'Show Constructive extension status (endpoint, tool count, actor, tenant, auth source).',
    handler: async (_args, context) => {
      const snapshot = await resolveRuntimeSnapshot(
        options,
        state,
        context,
        referenceOperation,
      );

      const cacheRoot = resolveExploreCacheRoot(context.cwd, options.explore?.cacheDir);
      const activeCatalog = readActiveCatalogPointer(cacheRoot);

      const message = [
        'Constructive extension status',
        `Session: ${snapshot.sessionId}`,
        `Tools: ${registeredToolCount}`,
        `Legacy tools enabled: ${shouldRegisterLegacyDocumentTools(options) ? 'yes' : 'no'}`,
        `Endpoint: ${snapshot.endpoint || '[missing]'}`,
        `Actor: ${snapshot.actorId}`,
        `Tenant: ${snapshot.tenantId || '[none]'}`,
        `Token source: ${snapshot.tokenSource}`,
        `Token: ${snapshot.tokenMasked || '[missing]'}`,
        `Active catalog: ${activeCatalog ? `${activeCatalog.catalogId} (${activeCatalog.toolCount} tools)` : '[none]'}`,
      ].join('\n');

      emitInfo(context, message, snapshot.endpoint ? 'info' : 'warning');
    },
  });

  api.registerCommand(buildCommandName(commandPrefix, 'auth-status'), {
    description:
      'Show Constructive auth source and masked token for the current session.',
    handler: async (_args, context) => {
      const snapshot = await resolveRuntimeSnapshot(
        options,
        state,
        context,
        referenceOperation,
      );

      const message = [
        'Constructive auth status',
        `Session: ${snapshot.sessionId}`,
        `Token source: ${snapshot.tokenSource}`,
        `Token: ${snapshot.tokenMasked || '[missing]'}`,
      ].join('\n');

      emitInfo(
        context,
        message,
        snapshot.tokenMasked ? 'info' : 'warning',
      );
    },
  });

  if (options.enableAuthSetCommand !== false) {
    api.registerCommand(buildCommandName(commandPrefix, 'auth-set'), {
      description:
        'Set or override Constructive bearer token for the current PI session (in-memory only).',
      handler: async (args, context) => {
        let token = normalizeString(args);

        if (!token && context.hasUI) {
          token = normalizeString(
            await context.ui.input(
              'Constructive Access Token',
              'Paste bearer token for this session',
            ),
          );
        }

        if (!token) {
          throw new Error(
            'No token provided. Pass it as command argument or use interactive input.',
          );
        }

        const sessionId = getSessionId(context);
        state.sessionTokens.set(sessionId, token);
        emitInfo(
          context,
          `Constructive token stored for session ${sessionId}.`,
        );
      },
    });
  }

  if (options.explore?.enabled === false) {
    return;
  }

  const exploreCommandName = buildCommandName(
    commandPrefix,
    getExploreCommandSuffix(options),
  );

  api.registerCommand(exploreCommandName, {
    description:
      'Authenticate, introspect, and generate ORM capability catalog for agent dispatch.',
    handler: async (args, context) => {
      const tokens = parseCommandTokens(args);
      const forceRefreshFlag =
        normalizeString(options.explore?.forceRefreshArg) ||
        DEFAULT_EXPLORE_FORCE_FLAG;
      const forceRefresh =
        tokens.includes('--refresh') || tokens.includes(forceRefreshFlag);
      const asJson = tokens.includes('--json');
      let executionContext:
        | Awaited<ReturnType<typeof resolveExecutionContext>>
        | undefined;

      try {
        executionContext = await resolveExecutionContext(
          options,
          state,
          context,
          referenceOperation,
          {},
        );

        const explore = await ensureOrmCatalog({
          cwd: context.cwd,
          endpoint: executionContext.endpoint,
          headers: executionContext.headers,
          databaseId: executionContext.databaseId,
          apiName: executionContext.apiName,
          metaSchema: executionContext.metaSchema,
          cacheDir: options.explore?.cacheDir,
          outputDirName: options.codegen?.outputDir,
          ttlMs: options.explore?.ttlMs ?? DEFAULT_EXPLORE_TTL_MS,
          forceRefresh,
          docs: options.codegen?.docs,
        });

        const sampleTools = explore.catalog.tools
          .slice(0, 10)
          .map((entry) => entry.name);

        const summary = {
          endpoint: executionContext.endpoint,
          catalogId: explore.pointer.catalogId,
          refreshed: explore.refreshed,
          toolCount: explore.catalog.tools.length,
          cacheRoot: explore.cacheRoot,
          outputRoot: explore.generatedOutputRoot,
          sampleTools,
        };

        if (asJson) {
          emitInfo(context, safeJson(summary));
          return;
        }

        emitInfo(
          context,
          [
            'Constructive explore complete',
            `Endpoint: ${summary.endpoint}`,
            `Catalog: ${summary.catalogId}`,
            `Refreshed: ${summary.refreshed ? 'yes' : 'no (cache)'}`,
            `Tools: ${summary.toolCount}`,
            `Sample: ${sampleTools.join(', ') || '[none]'}`,
          ].join('\n'),
        );
      } catch (error) {
        const commandPrefix = options.commandPrefix || DEFAULT_COMMAND_PREFIX;
        emitInfo(
          context,
          `Constructive explore failed: ${summarizeExploreFailure(error, {
            endpoint: executionContext?.endpoint,
            tokenSource: executionContext?.resolvedToken.source,
            commandPrefix,
          })}`,
          'error',
        );
        throw error;
      }
    },
  });

  api.registerCommand(getCapabilitiesCommandName(options), {
    description:
      'List discovered ORM capabilities from the active explore catalog.',
    handler: async (args, context) => {
      const tokens = parseCommandTokens(args);
      const asJson = tokens.includes('--json');
      const filter = tokens.find((token) => !token.startsWith('--'));

      const activeCatalog = resolveActiveCatalog(options, context);
      const filteredTools = activeCatalog.tools.filter((entry) => {
        if (!filter) {
          return true;
        }

        return (
          entry.name.includes(filter) ||
          entry.description.toLowerCase().includes(filter.toLowerCase())
        );
      });

      if (asJson) {
        emitInfo(
          context,
          safeJson(
            filteredTools.map((entry) => ({
              name: entry.name,
              description: entry.description,
              capability: entry._meta.policy.capability,
              riskClass: entry._meta.policy.riskClass,
            })),
          ),
        );
        return;
      }

      const lines = [
        'Constructive capabilities',
        `Count: ${filteredTools.length}`,
      ];

      for (const tool of filteredTools.slice(0, 100)) {
        lines.push(
          `- ${tool.name} (${tool._meta.policy.capability}/${tool._meta.policy.riskClass}): ${tool.description}`,
        );
      }

      emitInfo(context, lines.join('\n'));
    },
  });
};

export function createConstructiveTools(
  options: CreateConstructivePiExtensionOptions = {},
): ToolDefinition[] {
  const operations = buildOperations(options);
  const state: ConstructiveExtensionState = {
    sessionTokens: new Map<string, string>(),
  };

  const tools: ToolDefinition[] = [];

  if (shouldRegisterLegacyDocumentTools(options)) {
    tools.push(
      ...operations.map((operation) =>
        toLegacyToolDefinition(operation, options, state),
      ),
    );
  }

  if (options.ormDispatcher?.enabled !== false) {
    tools.push(toOrmDispatcherToolDefinition(options, state));
  }

  return tools;
}

export function createConstructivePiExtension(
  options: CreateConstructivePiExtensionOptions = {},
): ExtensionFactory {
  const operations = buildOperations(options);
  const state: ConstructiveExtensionState = {
    sessionTokens: new Map<string, string>(),
  };

  const registerLegacyTools = shouldRegisterLegacyDocumentTools(options);
  const registerOrmDispatcher = options.ormDispatcher?.enabled !== false;

  return (api: ExtensionAPI): void => {
    if (registerLegacyTools) {
      for (const operation of operations) {
        api.registerTool(toLegacyToolDefinition(operation, options, state));
      }
    }

    if (registerOrmDispatcher) {
      api.registerTool(toOrmDispatcherToolDefinition(options, state));
    }

    const registeredToolCount =
      (registerLegacyTools ? operations.length : 0) +
      (registerOrmDispatcher ? 1 : 0);

    registerCommands(api, options, operations, state, registeredToolCount);
  };
}

export const defaultConstructivePiExtension =
  createConstructivePiExtension();
