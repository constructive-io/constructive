import { Static, TSchema, Type } from '@sinclair/typebox';

export const PROTOCOL_VERSION = 'constructive.dev/cli/v1' as const;

export const ExecutionModeSchema = Type.Union([
  Type.Literal('human'),
  Type.Literal('agent'),
  Type.Literal('ci'),
]);
export type ExecutionMode = Static<typeof ExecutionModeSchema>;

export const OutputFormatSchema = Type.Union([
  Type.Literal('human'),
  Type.Literal('json'),
  Type.Literal('jsonl'),
]);
export type OutputFormat = Static<typeof OutputFormatSchema>;

export const CommandLifecycleSchema = Type.Union([
  Type.Literal('finite'),
  Type.Literal('long-running'),
]);
export type CommandLifecycle = Static<typeof CommandLifecycleSchema>;

export const CommandEffectSchema = Type.Union([
  Type.Literal('read'),
  Type.Literal('write'),
  Type.Literal('destructive'),
  Type.Literal('service'),
]);
export type CommandEffect = Static<typeof CommandEffectSchema>;

export const WarningSchema = Type.Object(
  {
    code: Type.String({ minLength: 1 }),
    message: Type.String({ minLength: 1 }),
    path: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);
export type OperationWarning = Static<typeof WarningSchema>;

export const ArtifactSchema = Type.Object(
  {
    type: Type.String({ minLength: 1 }),
    path: Type.String({ minLength: 1 }),
    digest: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);
export type OperationArtifact = Static<typeof ArtifactSchema>;

export const NextActionSchema = Type.Object(
  {
    commandId: Type.String({ minLength: 1 }),
    input: Type.Record(Type.String(), Type.Unknown()),
    reason: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);
export type NextAction = Static<typeof NextActionSchema>;

export interface OperationResult<T> {
  data: T;
  warnings?: OperationWarning[];
  artifacts?: OperationArtifact[];
  nextActions?: NextAction[];
}

/** The schema shared by results whose command-specific data schema is not known. */
export const OperationResultSchema = Type.Object(
  {
    data: Type.Unknown(),
    warnings: Type.Optional(Type.Array(WarningSchema)),
    artifacts: Type.Optional(Type.Array(ArtifactSchema)),
    nextActions: Type.Optional(Type.Array(NextActionSchema)),
  },
  { additionalProperties: false }
);

/** Builds the exact wire-result schema for a command output schema. */
export function operationResultSchema<TData extends TSchema>(data: TData) {
  return Type.Object(
    {
      data,
      warnings: Type.Optional(Type.Array(WarningSchema)),
      artifacts: Type.Optional(Type.Array(ArtifactSchema)),
      nextActions: Type.Optional(Type.Array(NextActionSchema)),
    },
    { additionalProperties: false }
  );
}

export const ErrorCategorySchema = Type.Union([
  Type.Literal('invocation'),
  Type.Literal('validation'),
  Type.Literal('configuration'),
  Type.Literal('authentication'),
  Type.Literal('authorization'),
  Type.Literal('conflict'),
  Type.Literal('network'),
  Type.Literal('operation'),
  Type.Literal('internal'),
]);
export type ErrorCategory = Static<typeof ErrorCategorySchema>;

export const StructuredErrorSchema = Type.Object(
  {
    code: Type.String({ minLength: 1 }),
    category: ErrorCategorySchema,
    message: Type.String({ minLength: 1 }),
    path: Type.Optional(Type.String()),
    details: Type.Optional(Type.Unknown()),
    retryable: Type.Boolean(),
    nextActions: Type.Optional(Type.Array(NextActionSchema)),
  },
  { additionalProperties: false }
);
export type StructuredError = Static<typeof StructuredErrorSchema>;

export type BindingValueType = 'string' | 'number' | 'boolean' | 'json';

export interface PositionalBindingSource {
  kind: 'positional';
  index: number;
  name?: string;
  variadic?: boolean;
}

export interface OptionBindingSource {
  kind: 'option';
  /** Canonical long name without the leading `--`. */
  name: string;
  /** Additional names without leading dashes. */
  aliases?: string[];
  /** Aliases retained for compatibility which produce CLI_DEPRECATED warnings. */
  deprecatedAliases?: string[];
  short?: string;
  negatable?: boolean;
  /** Marks values supplied through this option as secrets for protocol redaction. */
  sensitive?: boolean;
}

export interface EnvironmentBindingSource {
  kind: 'environment';
  name: string;
  sensitive?: boolean;
}

export interface ConstantBindingSource {
  kind: 'constant';
  value: unknown;
}

export type BindingSource =
  | PositionalBindingSource
  | OptionBindingSource
  | EnvironmentBindingSource
  | ConstantBindingSource;

export interface InputBinding {
  /** Top-level input property populated by this binding. */
  property: string;
  /** Sources are evaluated in order. */
  sources: BindingSource[];
  valueType?: BindingValueType;
  repeated?: boolean;
  /** Reject invocations which provide more than one source. */
  conflict?: 'first' | 'error';
  description?: string;
  valueName?: string;
}

export interface SafetyCapabilities {
  dryRun?: boolean;
  idempotencyKey?: boolean;
  confirmation?: boolean;
  destructiveAcknowledgements?: readonly string[];
}

export const SafetyCapabilitiesSchema = Type.Object(
  {
    dryRun: Type.Optional(Type.Boolean()),
    idempotencyKey: Type.Optional(Type.Boolean()),
    confirmation: Type.Optional(Type.Boolean()),
    destructiveAcknowledgements: Type.Optional(
      Type.Array(Type.String({ minLength: 1 }), { uniqueItems: true })
    ),
  },
  { additionalProperties: false }
);

/** Creates a self-contained protocol-safe JSON-value schema with a unique reference id. */
export function createJsonValueSchema(id: string) {
  return Type.Recursive(
    (JsonValue) =>
      Type.Union([
        Type.Null(),
        Type.Boolean(),
        Type.Number(),
        Type.String(),
        Type.Array(JsonValue),
        Type.Record(Type.String(), JsonValue),
      ]),
    { $id: id }
  );
}

/** A standalone protocol-safe JSON value used for constant bindings. */
export const JsonValueSchema = createJsonValueSchema(
  'https://constructive.dev/cli/v1/schemas/json-value'
);

export const PositionalBindingSourceSchema = Type.Object(
  {
    kind: Type.Literal('positional'),
    index: Type.Integer({ minimum: 0 }),
    name: Type.Optional(Type.String()),
    variadic: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false }
);

export const OptionBindingSourceSchema = Type.Object(
  {
    kind: Type.Literal('option'),
    name: Type.String({ minLength: 1 }),
    aliases: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    deprecatedAliases: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    short: Type.Optional(Type.String({ minLength: 1, maxLength: 1 })),
    negatable: Type.Optional(Type.Boolean()),
    sensitive: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false }
);

export const EnvironmentBindingSourceSchema = Type.Object(
  {
    kind: Type.Literal('environment'),
    name: Type.String({ minLength: 1 }),
    sensitive: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false }
);

export const ConstantBindingSourceSchema = Type.Object(
  {
    kind: Type.Literal('constant'),
    value: JsonValueSchema,
  },
  { additionalProperties: false }
);

export const BindingSourceSchema = Type.Union([
  PositionalBindingSourceSchema,
  OptionBindingSourceSchema,
  EnvironmentBindingSourceSchema,
  ConstantBindingSourceSchema,
]);

export const InputBindingSchema = Type.Object(
  {
    property: Type.String({ minLength: 1 }),
    sources: Type.Array(BindingSourceSchema),
    valueType: Type.Optional(
      Type.Union([
        Type.Literal('string'),
        Type.Literal('number'),
        Type.Literal('boolean'),
        Type.Literal('json'),
      ])
    ),
    repeated: Type.Optional(Type.Boolean()),
    conflict: Type.Optional(
      Type.Union([Type.Literal('first'), Type.Literal('error')])
    ),
    description: Type.Optional(Type.String()),
    valueName: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);

export const CommandExampleSchema = Type.Object(
  {
    description: Type.Optional(Type.String()),
    argv: Type.Array(Type.String()),
  },
  { additionalProperties: false }
);

export interface ApprovedCapabilities {
  yes: boolean;
  dryRun?: boolean;
  idempotencyKey?: string;
  acknowledgedRisks: readonly string[];
}

export interface CommandExample {
  description?: string;
  argv: readonly string[];
}

export interface EventReporter<TEvent = unknown> {
  emit(event: TEvent): Promise<void>;
}

export interface OperationContext<TEvent = unknown> {
  cwd: string;
  mode: ExecutionMode;
  /** Environment snapshot supplied by the outer adapter; operations never read process.env directly. */
  env: Readonly<Record<string, string | undefined>>;
  signal: AbortSignal;
  operationId: string;
  now(): Date;
  events: EventReporter<TEvent>;
  capabilities: ApprovedCapabilities;
  /** Register secrets discovered during execution before they can reach protocol output. */
  registerSensitiveValue(value: string): void;
}

/** Terminal-only hooks live outside CommandDefinition so the operation contract stays reusable. */
export interface CommandAdapterHooks<TInput = unknown, TOutput = unknown> {
  collectInteractiveInput?: (
    input: Partial<TInput>,
    context: Readonly<
      Pick<OperationContext, 'cwd' | 'env' | 'signal' | 'operationId'>
    >
  ) => Promise<TInput>;
  renderHuman?: (result: OperationResult<TOutput>) => string;
}

export type CommandAdapterHookMap = Readonly<
  Record<string, CommandAdapterHooks>
>;

export interface CommandDefinition<
  TInput extends TSchema = TSchema,
  TOutput extends TSchema = TSchema,
  TEvent extends TSchema = TSchema,
> {
  id: string;
  path: readonly string[];
  summary: string;
  description?: string;
  input: TInput;
  output: TOutput;
  events?: TEvent;
  bindings: readonly InputBinding[];
  examples: readonly CommandExample[];
  lifecycle: CommandLifecycle;
  effect: CommandEffect;
  capabilities?: SafetyCapabilities;
  execute(
    input: Static<TInput>,
    context: OperationContext<Static<TEvent>>
  ): Promise<OperationResult<Static<TOutput>>>;
}

export function defineCommand<
  TInput extends TSchema,
  TOutput extends TSchema,
  TEvent extends TSchema = TSchema,
>(
  definition: CommandDefinition<TInput, TOutput, TEvent>
): CommandDefinition<TInput, TOutput, TEvent> {
  return definition;
}

export interface ExecutionSettings {
  mode: ExecutionMode;
  format: OutputFormat;
  interactive: boolean;
  terminalEffects: boolean;
  mayOpenBrowser: boolean;
  checkForUpdates: boolean;
}

export interface OperationStartedEvent {
  protocolVersion: typeof PROTOCOL_VERSION;
  event: 'operation.started';
  operationId: string;
  commandId: string;
  timestamp: string;
}

const ProtocolIdentityProperties = {
  protocolVersion: Type.Literal(PROTOCOL_VERSION),
  operationId: Type.String({ minLength: 1 }),
  commandId: Type.String({ minLength: 1 }),
  timestamp: Type.String({ minLength: 1 }),
};

export const OperationStartedEventSchema = Type.Object(
  {
    ...ProtocolIdentityProperties,
    event: Type.Literal('operation.started'),
  },
  { additionalProperties: false }
);

export interface DomainProtocolEvent {
  protocolVersion: typeof PROTOCOL_VERSION;
  event: string;
  operationId: string;
  commandId: string;
  timestamp: string;
  [key: string]: unknown;
}

export const DomainProtocolEventSchema = Type.Object(
  {
    ...ProtocolIdentityProperties,
    event: Type.String({
      minLength: 1,
      pattern: '^(?!operation\\.(?:started|completed|failed|cancelled)$).+',
    }),
  },
  { additionalProperties: true }
);

export interface OperationCompletedEvent {
  protocolVersion: typeof PROTOCOL_VERSION;
  event: 'operation.completed';
  operationId: string;
  commandId: string;
  timestamp: string;
  durationMs: number;
  result: OperationResult<unknown>;
}

export const OperationCompletedEventSchema = Type.Object(
  {
    ...ProtocolIdentityProperties,
    event: Type.Literal('operation.completed'),
    durationMs: Type.Number({ minimum: 0 }),
    result: OperationResultSchema,
  },
  { additionalProperties: false }
);

export interface OperationFailedEvent {
  protocolVersion: typeof PROTOCOL_VERSION;
  event: 'operation.failed';
  operationId: string;
  commandId: string;
  timestamp: string;
  durationMs: number;
  error: StructuredError;
  warnings?: OperationWarning[];
}

export const OperationFailedEventSchema = Type.Object(
  {
    ...ProtocolIdentityProperties,
    event: Type.Literal('operation.failed'),
    durationMs: Type.Number({ minimum: 0 }),
    error: StructuredErrorSchema,
    warnings: Type.Optional(Type.Array(WarningSchema)),
  },
  { additionalProperties: false }
);

export interface OperationCancelledEvent {
  protocolVersion: typeof PROTOCOL_VERSION;
  event: 'operation.cancelled';
  operationId: string;
  commandId: string;
  timestamp: string;
  durationMs: number;
  error: StructuredError;
  warnings?: OperationWarning[];
}

export const OperationCancelledEventSchema = Type.Object(
  {
    ...ProtocolIdentityProperties,
    event: Type.Literal('operation.cancelled'),
    durationMs: Type.Number({ minimum: 0 }),
    error: StructuredErrorSchema,
    warnings: Type.Optional(Type.Array(WarningSchema)),
  },
  { additionalProperties: false }
);

export type TerminalProtocolEvent =
  | OperationCompletedEvent
  | OperationFailedEvent
  | OperationCancelledEvent;

export type ProtocolEvent =
  | OperationStartedEvent
  | DomainProtocolEvent
  | TerminalProtocolEvent;

export const TerminalProtocolEventSchema = Type.Union([
  OperationCompletedEventSchema,
  OperationFailedEventSchema,
  OperationCancelledEventSchema,
]);

export const ProtocolEventSchema = Type.Union([
  OperationStartedEventSchema,
  DomainProtocolEventSchema,
  TerminalProtocolEventSchema,
]);

export type ExecutionStatus = 'completed' | 'failed' | 'cancelled';

export interface ExecutionOutcome {
  status: ExecutionStatus;
  commandId: string;
  operationId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  result?: OperationResult<unknown>;
  error?: StructuredError;
  warnings?: OperationWarning[];
  /** Terminal envelope retained even when event transcript capture is disabled. */
  terminalEvent: TerminalProtocolEvent;
  /** Complete transcript for buffered adapters and tests. */
  protocolEvents: ProtocolEvent[];
}

export const ExecutionOutcomeSchema = Type.Object(
  {
    status: Type.Union([
      Type.Literal('completed'),
      Type.Literal('failed'),
      Type.Literal('cancelled'),
    ]),
    commandId: Type.String({ minLength: 1 }),
    operationId: Type.String({ minLength: 1 }),
    startedAt: Type.String({ minLength: 1 }),
    completedAt: Type.String({ minLength: 1 }),
    durationMs: Type.Number({ minimum: 0 }),
    result: Type.Optional(OperationResultSchema),
    error: Type.Optional(StructuredErrorSchema),
    warnings: Type.Optional(Type.Array(WarningSchema)),
    terminalEvent: TerminalProtocolEventSchema,
    protocolEvents: Type.Array(ProtocolEventSchema),
  },
  { additionalProperties: false }
);

export type ProtocolEventSink = (event: ProtocolEvent) => void | Promise<void>;

export interface BindArgumentsOptions {
  argv: readonly string[];
  env?: Readonly<Record<string, string | undefined>>;
  strict?: boolean;
  /** Optional adapter-owned warning accumulator retained even when binding fails. */
  warnings?: OperationWarning[];
  /** Defer schema validation until after an interactive adapter has collected missing input. */
  validate?: boolean;
}

export interface BoundArguments<T = Record<string, unknown>> {
  input: T;
  warnings: OperationWarning[];
  sensitiveValues: string[];
}
