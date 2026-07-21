import {
  CliError,
  defineCommand,
  Type,
  type OperationContext,
  type OperationWarning,
} from '@constructive-io/cli-runtime';

import {
  ConfigStoreError,
  TokenSourceError,
  createContextAndMaybeActivate,
  deleteContext,
  getContextCredentials,
  getCurrentContext,
  listContextsFromState,
  removeContextCredentials,
  resolveContext,
  resolveContextFromState,
  resolveToken,
  setContextCredentials,
  setCurrentContext,
  type ConfigStore,
  type CncState,
  type ContextConfig,
  type ContextCredentials,
} from '../config';

const ContextSchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    endpoint: Type.String({ minLength: 1 }),
    createdAt: Type.String({ minLength: 1 }),
    updatedAt: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);

const AuthenticationStatusSchema = Type.Union([
  Type.Literal('authenticated'),
  Type.Literal('expired'),
  Type.Literal('missing'),
]);

const ContextSummarySchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    endpoint: Type.String({ minLength: 1 }),
    createdAt: Type.String({ minLength: 1 }),
    updatedAt: Type.String({ minLength: 1 }),
    current: Type.Boolean(),
    authentication: AuthenticationStatusSchema,
    expiresAt: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);

const EmptyInputSchema = Type.Object({}, { additionalProperties: false });

export interface StateCommandDependencies {
  /** Inject a store for embedding and isolated tests. */
  store: ConfigStore;
}

const getStore = (dependencies: StateCommandDependencies): ConfigStore =>
  dependencies.store;

const configErrorCategory = (
  code: ConfigStoreError['code']
): 'validation' | 'configuration' | 'conflict' => {
  if (code === 'CONTEXT_NAME_INVALID' || code === 'CONTEXT_ENDPOINT_INVALID') {
    return 'validation';
  }
  if (code === 'CONFIG_LOCK_TIMEOUT') return 'conflict';
  return 'configuration';
};

const throwStateError = (error: unknown): never => {
  if (error instanceof CliError) throw error;
  if (error instanceof ConfigStoreError) {
    throw new CliError({
      code: error.code,
      category: configErrorCategory(error.code),
      message: error.message,
      details: error.details,
      retryable: error.code === 'CONFIG_LOCK_TIMEOUT',
      cause: error,
    });
  }
  if (error instanceof TokenSourceError) {
    throw new CliError({
      code: error.code,
      category: 'invocation',
      message: error.message,
      retryable: false,
      cause: error,
    });
  }
  throw error;
};

const runStateOperation = <T>(operation: () => T): T => {
  try {
    return operation();
  } catch (error) {
    return throwStateError(error);
  }
};

const requireConfirmation = (
  context: OperationContext,
  command: string
): void => {
  if (context.capabilities.yes) return;
  throw new CliError({
    code: 'CLI_CONFIRMATION_REQUIRED',
    category: 'invocation',
    message: `${command} requires explicit confirmation.`,
    retryable: false,
  });
};

const authenticationStatus = (
  credentials: ContextCredentials | null,
  now: Date
): 'authenticated' | 'expired' | 'missing' => {
  if (!credentials?.token) return 'missing';
  if (credentials.expiresAt && new Date(credentials.expiresAt) <= now) {
    return 'expired';
  }
  return 'authenticated';
};

const summarizeContext = (
  context: ContextConfig,
  currentContext: string | undefined,
  credentials: ContextCredentials | null,
  now: Date
) => ({
  ...context,
  current: context.name === currentContext,
  authentication: authenticationStatus(credentials, now),
  ...(credentials?.expiresAt === undefined
    ? {}
    : { expiresAt: credentials.expiresAt }),
});

const resolveTargetContext = (
  contextName: string | undefined,
  context: OperationContext,
  store: ConfigStore,
  state?: CncState
) =>
  runStateOperation(() =>
    state
      ? resolveContextFromState(state, {
          contextName,
          env: context.env,
          allowCurrentContext: context.mode === 'human',
        })
      : resolveContext({
          contextName,
          env: context.env,
          allowCurrentContext: context.mode === 'human',
          store,
        })
  ).context;

const ContextNameInputSchema = Type.Object(
  { name: Type.String({ minLength: 1 }) },
  { additionalProperties: false }
);

export function createContextCommands(dependencies: StateCommandDependencies) {
  const createCommand = defineCommand({
    id: 'context.create',
    path: ['context', 'create'],
    summary: 'Create a named GraphQL endpoint context.',
    input: Type.Object(
      {
        name: Type.String({ minLength: 1 }),
        endpoint: Type.String({ minLength: 1 }),
      },
      { additionalProperties: false }
    ),
    output: Type.Object(
      { context: ContextSchema, activated: Type.Boolean() },
      { additionalProperties: false }
    ),
    bindings: [
      {
        property: 'name',
        sources: [{ kind: 'positional', index: 0, name: 'name' }],
        description: 'Unique context name.',
      },
      {
        property: 'endpoint',
        sources: [{ kind: 'option', name: 'endpoint' }],
        description: 'Absolute HTTP or HTTPS GraphQL endpoint.',
      },
    ],
    examples: [
      {
        argv: [
          'context',
          'create',
          'production',
          '--endpoint',
          'https://api.example.com/graphql',
        ],
      },
    ],
    lifecycle: 'finite',
    effect: 'write',
    async execute(input, context) {
      const store = getStore(dependencies);
      const { context: created, activated } = runStateOperation(() =>
        createContextAndMaybeActivate(
          input.name,
          input.endpoint,
          store,
          context.now()
        )
      );
      return {
        data: { context: created, activated },
        nextActions: [
          {
            commandId: 'auth.set-token',
            input: { contextName: created.name },
            reason: 'Configure authentication for the new context.',
          },
        ],
      };
    },
  });

  const listCommand = defineCommand({
    id: 'context.list',
    path: ['context', 'list'],
    summary: 'List configured contexts without exposing credentials.',
    input: EmptyInputSchema,
    output: Type.Object(
      { contexts: Type.Array(ContextSummarySchema) },
      { additionalProperties: false }
    ),
    bindings: [],
    examples: [{ argv: ['context', 'list'] }],
    lifecycle: 'finite',
    effect: 'read',
    async execute(_input, context) {
      const store = getStore(dependencies);
      const state = runStateOperation(() => store.read());
      return {
        data: {
          contexts: listContextsFromState(state).map((configured) =>
            summarizeContext(
              configured,
              state.settings.currentContext,
              state.credentials.tokens[configured.name] ?? null,
              context.now()
            )
          ),
        },
      };
    },
  });

  const useCommand = defineCommand({
    id: 'context.use',
    path: ['context', 'use'],
    summary: 'Select the current context for interactive use.',
    input: ContextNameInputSchema,
    output: Type.Object(
      {
        contextName: Type.String({ minLength: 1 }),
        current: Type.Literal(true),
      },
      { additionalProperties: false }
    ),
    bindings: [
      {
        property: 'name',
        sources: [{ kind: 'positional', index: 0, name: 'name' }],
        description: 'Context to select.',
      },
    ],
    examples: [{ argv: ['context', 'use', 'production'] }],
    lifecycle: 'finite',
    effect: 'write',
    async execute(input) {
      const store = getStore(dependencies);
      const changed = runStateOperation(() =>
        setCurrentContext(input.name, store)
      );
      if (!changed) {
        throw new CliError({
          code: 'CONTEXT_NOT_FOUND',
          category: 'configuration',
          message: `Context "${input.name}" was not found.`,
          details: { contextName: input.name },
          retryable: false,
          nextActions: [
            {
              commandId: 'context.list',
              input: {},
              reason: 'Inspect the available contexts.',
            },
          ],
        });
      }
      return { data: { contextName: input.name, current: true as const } };
    },
  });

  const currentCommand = defineCommand({
    id: 'context.current',
    path: ['context', 'current'],
    summary: 'Inspect the currently selected interactive context.',
    input: EmptyInputSchema,
    output: Type.Object(
      { context: Type.Union([ContextSummarySchema, Type.Null()]) },
      { additionalProperties: false }
    ),
    bindings: [],
    examples: [{ argv: ['context', 'current'] }],
    lifecycle: 'finite',
    effect: 'read',
    async execute(_input, context) {
      const store = getStore(dependencies);
      const current = runStateOperation(() => getCurrentContext(store));
      if (!current) return { data: { context: null } };
      return {
        data: {
          context: summarizeContext(
            current,
            current.name,
            runStateOperation(() => getContextCredentials(current.name, store)),
            context.now()
          ),
        },
      };
    },
  });

  const deleteCommand = defineCommand({
    id: 'context.delete',
    path: ['context', 'delete'],
    summary: 'Delete a context and its stored credentials.',
    input: ContextNameInputSchema,
    output: Type.Object(
      {
        contextName: Type.String({ minLength: 1 }),
        deleted: Type.Literal(true),
      },
      { additionalProperties: false }
    ),
    bindings: [
      {
        property: 'name',
        sources: [{ kind: 'positional', index: 0, name: 'name' }],
        description: 'Context to delete.',
      },
    ],
    examples: [{ argv: ['context', 'delete', 'production', '--yes'] }],
    lifecycle: 'finite',
    effect: 'destructive',
    capabilities: { confirmation: true },
    async execute(input, context) {
      requireConfirmation(context, 'Deleting a context');
      const deleted = runStateOperation(() =>
        deleteContext(input.name, getStore(dependencies))
      );
      if (!deleted) {
        throw new CliError({
          code: 'CONTEXT_NOT_FOUND',
          category: 'configuration',
          message: `Context "${input.name}" was not found.`,
          details: { contextName: input.name },
          retryable: false,
        });
      }
      return {
        data: { contextName: input.name, deleted: true as const },
      };
    },
  });

  return [
    createCommand,
    listCommand,
    useCommand,
    currentCommand,
    deleteCommand,
  ] as const;
}

const ContextTargetInputSchema = Type.Object(
  { contextName: Type.Optional(Type.String({ minLength: 1 })) },
  { additionalProperties: false }
);

const contextTargetBinding = {
  property: 'contextName',
  sources: [
    { kind: 'option' as const, name: 'context' },
    { kind: 'environment' as const, name: 'CNC_CONTEXT' },
  ],
  conflict: 'first' as const,
  description: 'Target context. CNC_CONTEXT is used when the option is absent.',
};

export function createAuthCommands(dependencies: StateCommandDependencies) {
  const setTokenCommand = defineCommand({
    id: 'auth.set-token',
    path: ['auth', 'set-token'],
    summary: 'Store an API token for one explicit context.',
    description:
      'Agents must use CNC_TOKEN or adapter-provided stdin. Positional tokens remain a deprecated human-only compatibility path.',
    input: Type.Object(
      {
        contextName: Type.Optional(Type.String({ minLength: 1 })),
        legacyValue: Type.Optional(
          Type.String({ minLength: 1, writeOnly: true })
        ),
        stdinValue: Type.Optional(
          Type.String({ minLength: 1, writeOnly: true })
        ),
        readFromStdin: Type.Optional(Type.Boolean()),
        environmentValue: Type.Optional(
          Type.String({ minLength: 1, writeOnly: true })
        ),
        expiresAt: Type.Optional(Type.String({ minLength: 1 })),
      },
      { additionalProperties: false }
    ),
    output: Type.Object(
      {
        contextName: Type.String({ minLength: 1 }),
        saved: Type.Literal(true),
        expiresAt: Type.Optional(Type.String()),
      },
      { additionalProperties: false }
    ),
    bindings: [
      contextTargetBinding,
      {
        property: 'legacyValue',
        sources: [{ kind: 'positional', index: 0, name: 'token' }],
        description: 'Deprecated human-only token argument.',
      },
      {
        property: 'stdinValue',
        sources: [],
        description: 'Sensitive token injected by the terminal stdin adapter.',
      },
      {
        property: 'readFromStdin',
        sources: [{ kind: 'option', name: 'token-stdin' }],
        valueType: 'boolean',
        description: 'Read the token from standard input without echoing it.',
      },
      {
        property: 'environmentValue',
        sources: [{ kind: 'environment', name: 'CNC_TOKEN', sensitive: true }],
        description: 'Sensitive token supplied through CNC_TOKEN.',
      },
      {
        property: 'expiresAt',
        sources: [
          {
            kind: 'option',
            name: 'expires',
            aliases: ['expires-at'],
          },
        ],
        description: 'Optional ISO-8601 expiration date.',
      },
    ],
    examples: [
      {
        argv: ['auth', 'set-token', '--context', 'production', '--token-stdin'],
        description: 'Read the token from standard input.',
      },
    ],
    lifecycle: 'finite',
    effect: 'write',
    async execute(input, context) {
      if (context.mode !== 'human' && input.legacyValue !== undefined) {
        throw new CliError({
          code: 'AUTH_POSITIONAL_TOKEN_UNSUPPORTED',
          category: 'invocation',
          message:
            'Positional tokens are not accepted in agent or CI mode. Use CNC_TOKEN or --token-stdin.',
          retryable: false,
        });
      }
      if (
        input.expiresAt !== undefined &&
        !Number.isFinite(Date.parse(input.expiresAt))
      ) {
        throw new CliError({
          code: 'AUTH_EXPIRATION_INVALID',
          category: 'validation',
          message: '--expires must be a valid ISO-8601 date.',
          path: '/expiresAt',
          retryable: false,
        });
      }

      const store = getStore(dependencies);
      const target = resolveTargetContext(input.contextName, context, store);
      const resolved = runStateOperation(() =>
        resolveToken({
          token: input.legacyValue,
          stdinToken: input.stdinValue,
          env: {
            CNC_TOKEN: input.environmentValue ?? context.env.CNC_TOKEN,
          },
        })
      );
      runStateOperation(() =>
        setContextCredentials(
          target.name,
          resolved!.token,
          { expiresAt: input.expiresAt },
          store
        )
      );

      const warnings: OperationWarning[] =
        input.legacyValue === undefined
          ? []
          : [
              {
                code: 'CLI_DEPRECATED',
                message:
                  'Passing a token positionally is deprecated; use CNC_TOKEN or --token-stdin.',
              },
            ];
      return {
        data: {
          contextName: target.name,
          saved: true as const,
          ...(input.expiresAt === undefined
            ? {}
            : { expiresAt: input.expiresAt }),
        },
        ...(warnings.length === 0 ? {} : { warnings }),
      };
    },
  });

  const statusCommand = defineCommand({
    id: 'auth.status',
    path: ['auth', 'status'],
    summary: 'Inspect authentication state without exposing token material.',
    input: ContextTargetInputSchema,
    output: Type.Object(
      {
        contexts: Type.Array(
          Type.Object(
            {
              contextName: Type.String({ minLength: 1 }),
              current: Type.Boolean(),
              status: AuthenticationStatusSchema,
              expiresAt: Type.Optional(Type.String()),
            },
            { additionalProperties: false }
          )
        ),
      },
      { additionalProperties: false }
    ),
    bindings: [contextTargetBinding],
    examples: [
      { argv: ['auth', 'status', '--context', 'production'] },
      {
        argv: ['auth', 'status'],
        description: 'List every context in interactive human mode.',
      },
    ],
    lifecycle: 'finite',
    effect: 'read',
    async execute(input, context) {
      const store = getStore(dependencies);
      const state = runStateOperation(() => store.read());
      let selected: ContextConfig[];
      if (input.contextName || context.env.CNC_CONTEXT) {
        selected = [
          resolveTargetContext(input.contextName, context, store, state),
        ];
      } else if (context.mode === 'human') {
        selected = listContextsFromState(state);
      } else {
        throw new CliError({
          code: 'CONTEXT_REQUIRED',
          category: 'configuration',
          message: 'A context is required. Pass --context or set CNC_CONTEXT.',
          retryable: false,
        });
      }

      return {
        data: {
          contexts: selected.map((configured) => {
            const credentials =
              state.credentials.tokens[configured.name] ?? null;
            return {
              contextName: configured.name,
              current: state.settings.currentContext === configured.name,
              status: authenticationStatus(credentials, context.now()),
              ...(credentials?.expiresAt === undefined
                ? {}
                : { expiresAt: credentials.expiresAt }),
            };
          }),
        },
      };
    },
  });

  const logoutCommand = defineCommand({
    id: 'auth.logout',
    path: ['auth', 'logout'],
    summary: 'Remove stored credentials for one context.',
    input: ContextTargetInputSchema,
    output: Type.Object(
      {
        contextName: Type.String({ minLength: 1 }),
        removed: Type.Boolean(),
      },
      { additionalProperties: false }
    ),
    bindings: [contextTargetBinding],
    examples: [
      { argv: ['auth', 'logout', '--context', 'production', '--yes'] },
    ],
    lifecycle: 'finite',
    effect: 'destructive',
    capabilities: { confirmation: true },
    async execute(input, context) {
      requireConfirmation(context, 'Removing credentials');
      const store = getStore(dependencies);
      const target = resolveTargetContext(input.contextName, context, store);
      return {
        data: {
          contextName: target.name,
          removed: runStateOperation(() =>
            removeContextCredentials(target.name, store)
          ),
        },
      };
    },
  });

  return [setTokenCommand, statusCommand, logoutCommand] as const;
}

export function createStateCommands(dependencies: StateCommandDependencies) {
  return [
    ...createContextCommands(dependencies),
    ...createAuthCommands(dependencies),
  ] as const;
}
