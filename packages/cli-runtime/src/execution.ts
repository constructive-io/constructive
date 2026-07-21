import { randomUUID } from 'node:crypto';
import { Type } from '@sinclair/typebox';

import {
  ApprovedCapabilities,
  CommandDefinition,
  ExecutionMode,
  ExecutionOutcome,
  ExecutionOutcomeSchema,
  NextAction,
  OperationResult,
  OperationWarning,
  PROTOCOL_VERSION,
  ProtocolEvent,
  ProtocolEventSchema,
  ProtocolEventSink,
  StructuredError,
  StructuredErrorSchema,
  TerminalProtocolEvent,
  WarningSchema,
} from './contracts';
import {
  cancelledError,
  CliError,
  ContractError,
  internalError,
  InvocationError,
  isCancellationError,
  normalizeKnownError,
} from './errors';
import {
  createRedactor,
  isSensitiveKey,
  RedactionOptions,
  sensitiveEnvironmentValues,
} from './redaction';
import { assertOperationResultMetadata, CommandRegistry } from './registry';
import { assertJsonValue, compileSchema } from './schema';
import { createOperationContext } from './operation-context';

export {
  createOperationContext,
  type CreateOperationContextOptions,
} from './operation-context';

const RESERVED_EVENTS = new Set([
  'operation.started',
  'operation.completed',
  'operation.failed',
  'operation.cancelled',
]);

const RESERVED_DOMAIN_FIELDS = new Set([
  'protocolVersion',
  'operationId',
  'commandId',
  'timestamp',
  'durationMs',
  'result',
  'error',
  'warnings',
]);

const protocolEventValidator =
  compileSchema<ProtocolEvent>(ProtocolEventSchema);
const structuredErrorValidator = compileSchema<StructuredError>(
  StructuredErrorSchema
);
const warningsValidator = compileSchema<OperationWarning[]>(
  Type.Array(WarningSchema)
);
const outcomeValidator = compileSchema<ExecutionOutcome>(
  ExecutionOutcomeSchema
);

interface SafeClock {
  read(): Date;
  failure(): ContractError | undefined;
}

function createSafeClock(clock: (() => Date) | undefined): SafeClock {
  let clockFailure: ContractError | undefined;
  return {
    read(): Date {
      try {
        const value = (clock ?? (() => new Date()))();
        if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
          throw new Error('invalid clock value');
        }
        return value;
      } catch {
        clockFailure ??= new ContractError(
          'CLI_CLOCK_CONTRACT_VIOLATION',
          'The operation clock did not return a valid Date.'
        );
        return new Date();
      }
    },
    failure: () => clockFailure,
  };
}

function resolveOperationId(value: unknown): {
  operationId: string;
  failure?: InvocationError;
} {
  if (value === undefined) return { operationId: randomUUID() };
  if (typeof value === 'string' && value.length > 0) {
    return { operationId: value };
  }
  return {
    operationId: randomUUID(),
    failure: new InvocationError(
      'CLI_OPERATION_ID_INVALID',
      'The operation ID must be a non-empty string.'
    ),
  };
}

class ProtocolSinkError extends Error {
  override readonly cause: unknown;

  constructor(cause: unknown) {
    super('The protocol event sink failed.');
    this.name = 'ProtocolSinkError';
    this.cause = cause;
  }
}

export interface ExecuteCommandOptions {
  cwd: string;
  mode: ExecutionMode;
  env?: Readonly<Record<string, string | undefined>>;
  signal?: AbortSignal;
  operationId?: string;
  now?: () => Date;
  capabilities?: Partial<ApprovedCapabilities>;
  sink?: ProtocolEventSink;
  redaction?: RedactionOptions;
  initialWarnings?: OperationResult<unknown>['warnings'];
  debug?: boolean;
  /** Set false for streaming adapters to avoid retaining long-running domain event transcripts. */
  captureEvents?: boolean;
}

export interface CreateFailureOutcomeOptions {
  commandId: string;
  error: unknown;
  operationId?: string;
  now?: () => Date;
  sink?: ProtocolEventSink;
  redaction?: RedactionOptions;
  debug?: boolean;
  cancelled?: boolean;
  warnings?: OperationWarning[];
  captureEvents?: boolean;
}

function debugDetails(error: unknown): unknown {
  if (!(error instanceof Error)) return { thrown: error };
  return { name: error.name, message: error.message, stack: error.stack };
}

function createExecutionRedactor(
  options: RedactionOptions | undefined,
  env: Readonly<Record<string, string | undefined>> = {},
  additionalSensitiveValues: readonly string[] = []
) {
  const sensitiveValues = new Set([
    ...(options?.sensitiveValues ?? []),
    ...sensitiveEnvironmentValues(env, options?.sensitiveKeys),
    ...additionalSensitiveValues,
  ]);
  const redact = (<T>(value: T): T =>
    createRedactor({
      replacement: options?.replacement,
      sensitiveKeys: options?.sensitiveKeys,
      sensitiveValues: [...sensitiveValues],
    })(value)) as ReturnType<typeof createRedactor>;
  return {
    redact,
    registerSensitiveValue(value: string): void {
      if (value.length > 0) sensitiveValues.add(value);
    },
  };
}

function commandSensitiveValues(
  command: CommandDefinition,
  input: unknown,
  env: Readonly<Record<string, string | undefined>>
): string[] {
  const values: string[] = [];
  const seen = new WeakSet<object>();
  const collectStrings = (value: unknown): void => {
    if (typeof value === 'string') {
      if (value.length > 0) values.push(value);
      return;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      values.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      if (seen.has(value)) return;
      seen.add(value);
      for (const key of Object.keys(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor !== undefined && 'value' in descriptor)
          collectStrings(descriptor.value);
      }
      return;
    }
    if (value !== null && typeof value === 'object') {
      if (seen.has(value)) return;
      seen.add(value);
      for (const key of Object.keys(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor !== undefined && 'value' in descriptor)
          collectStrings(descriptor.value);
      }
    }
  };

  const inputRecord =
    input !== null && typeof input === 'object'
      ? (input as Record<string, unknown>)
      : undefined;
  const inputProperties = (
    command.input as {
      properties?: Record<string, { writeOnly?: unknown }>;
    }
  ).properties;
  for (const binding of command.bindings) {
    const sensitiveInput =
      isSensitiveKey(binding.property) ||
      inputProperties?.[binding.property]?.writeOnly === true ||
      binding.sources.some(
        (source) => source.kind === 'option' && source.sensitive === true
      );
    if (sensitiveInput && inputRecord !== undefined) {
      const descriptor = Object.getOwnPropertyDescriptor(
        inputRecord,
        binding.property
      );
      if (descriptor !== undefined && 'value' in descriptor)
        collectStrings(descriptor.value);
    }
    for (const source of binding.sources) {
      if (source.kind === 'environment' && source.sensitive === true) {
        const value = env[source.name];
        if (value !== undefined && value.length > 0) values.push(value);
      }
    }
  }
  return [...new Set(values)];
}

function assertProtocolEvent(value: unknown): asserts value is ProtocolEvent {
  assertJsonValue(value);
  if (!protocolEventValidator.validate(value)) {
    throw new ContractError(
      'CLI_PROTOCOL_CONTRACT_VIOLATION',
      'A protocol event did not match its wire schema.',
      {
        issues: protocolEventValidator.issues(),
      }
    );
  }
}

function assertStructuredError(
  value: unknown
): asserts value is StructuredError {
  assertJsonValue(value);
  if (!structuredErrorValidator.validate(value)) {
    throw new ContractError(
      'CLI_ERROR_CONTRACT_VIOLATION',
      'A structured error did not match its wire schema.',
      {
        issues: structuredErrorValidator.issues(),
      }
    );
  }
}

function createPublisher(
  redact: ReturnType<typeof createRedactor>,
  sink: ProtocolEventSink | undefined,
  captureEvents: boolean
) {
  const transcript: ProtocolEvent[] = [];
  let sinkEnabled = sink !== undefined;

  const prepare = (event: ProtocolEvent): ProtocolEvent => {
    const safe = redact(event);
    assertProtocolEvent(safe);
    return safe;
  };

  const retain = (event: ProtocolEvent): void => {
    if (captureEvents) transcript.push(event);
  };

  const publish = async (
    event: ProtocolEvent,
    terminal = false
  ): Promise<ProtocolEvent> => {
    const safe = prepare(event);
    if (!terminal) retain(safe);
    if (sinkEnabled) {
      try {
        await sink!(safe);
      } catch (error) {
        sinkEnabled = false;
        throw new ProtocolSinkError(error);
      }
    }
    if (terminal) retain(safe);
    return safe;
  };

  return { transcript, prepare, publish, retain };
}

function safeWarnings(
  warnings: OperationWarning[] | undefined,
  redact: ReturnType<typeof createRedactor>
): OperationWarning[] {
  if (warnings === undefined || warnings.length === 0) return [];
  assertJsonValue(warnings);
  if (!warningsValidator.validate(warnings)) {
    throw new ContractError(
      'CLI_WARNING_CONTRACT_VIOLATION',
      'Operation warnings did not match their wire schema.',
      {
        issues: warningsValidator.issues(),
      }
    );
  }
  const safe = redact(warnings);
  assertJsonValue(safe);
  if (!warningsValidator.validate(safe)) {
    throw new ContractError(
      'CLI_WARNING_CONTRACT_VIOLATION',
      'Redacted operation warnings did not match their wire schema.',
      { issues: warningsValidator.issues() }
    );
  }
  return safe;
}

function safeStructuredError(
  error: StructuredError,
  redact: ReturnType<typeof createRedactor>
): StructuredError {
  const safe = redact(error);
  assertStructuredError(safe);
  return safe;
}

function sinkFailureError(
  error: ProtocolSinkError,
  debug: boolean | undefined
): StructuredError {
  return {
    code: 'CLI_PROTOCOL_SINK_FAILED',
    category: 'internal',
    message: 'The command could not deliver a protocol event.',
    ...(debug ? { details: debugDetails(error.cause) } : {}),
    retryable: false,
  };
}

function normalizeError(
  caught: unknown,
  signal: AbortSignal | undefined,
  debug: boolean | undefined,
  redact: ReturnType<typeof createRedactor>
): { status: 'failed' | 'cancelled'; error: StructuredError } {
  const cancelled = isCancellationError(caught, signal);
  const candidate = cancelled
    ? cancelledError(signal?.reason)
    : caught instanceof ProtocolSinkError
      ? sinkFailureError(caught, debug)
      : caught instanceof CliError
        ? normalizeKnownError(caught)
        : internalError(debug ? debugDetails(caught) : undefined);
  try {
    return {
      status: cancelled ? 'cancelled' : 'failed',
      error: safeStructuredError(candidate, redact),
    };
  } catch (contractFailure) {
    return {
      status: 'failed',
      error: safeStructuredError(
        internalError(debug ? debugDetails(contractFailure) : undefined),
        redact
      ),
    };
  }
}

function assertOutcome(outcome: ExecutionOutcome): void {
  assertJsonValue(outcome);
  if (!outcomeValidator.validate(outcome)) {
    throw new ContractError(
      'CLI_OUTCOME_CONTRACT_VIOLATION',
      'Execution outcome did not match its public schema.',
      {
        issues: outcomeValidator.issues(),
      }
    );
  }
}

function assertCapabilities(
  command: CommandDefinition,
  approved: Partial<ApprovedCapabilities> | undefined
): void {
  const declared = command.capabilities ?? {};
  if (approved?.dryRun !== undefined && declared.dryRun !== true) {
    throw new CliError({
      code: 'CLI_CAPABILITY_UNSUPPORTED',
      category: 'invocation',
      message: `Command "${command.path.join(' ')}" does not support dry runs.`,
    });
  }
  if (
    approved?.idempotencyKey !== undefined &&
    declared.idempotencyKey !== true
  ) {
    throw new CliError({
      code: 'CLI_CAPABILITY_UNSUPPORTED',
      category: 'invocation',
      message: `Command "${command.path.join(' ')}" does not support idempotency keys.`,
    });
  }
  if (command.effect === 'destructive' && approved?.yes !== true) {
    throw new CliError({
      code: 'CLI_CONFIRMATION_REQUIRED',
      category: 'invocation',
      message: `Destructive command "${command.path.join(' ')}" requires explicit confirmation.`,
    });
  }
  const allowedRisks = new Set(declared.destructiveAcknowledgements ?? []);
  const unsupportedRisks = (approved?.acknowledgedRisks ?? []).filter(
    (risk) => !allowedRisks.has(risk)
  );
  if (unsupportedRisks.length > 0) {
    throw new CliError({
      code: 'CLI_ACKNOWLEDGEMENT_UNSUPPORTED',
      category: 'invocation',
      message: `Command "${command.path.join(' ')}" does not declare one or more risk acknowledgements.`,
      details: { unsupportedRisks },
    });
  }
}

function assertRegisteredNextActions(
  registry: CommandRegistry,
  actions: readonly NextAction[] | undefined,
  source: string
): void {
  for (const [index, action] of (actions ?? []).entries()) {
    if (registry.getById(action.commandId) === undefined) {
      throw new ContractError(
        'CLI_NEXT_ACTION_COMMAND_UNKNOWN',
        `${source} references an unregistered next-action command.`,
        { index, commandId: action.commandId }
      );
    }
    const issues = registry.validateInput(action.commandId, action.input);
    if (issues.length > 0) {
      throw new ContractError(
        'CLI_NEXT_ACTION_INPUT_INVALID',
        `${source} contains input which does not satisfy its next-action command.`,
        { index, commandId: action.commandId, issues }
      );
    }
  }
}

async function finalizeTerminal(
  publisher: ReturnType<typeof createPublisher>,
  terminal: TerminalProtocolEvent,
  fallback: (error: unknown) => TerminalProtocolEvent
): Promise<TerminalProtocolEvent> {
  try {
    return (await publisher.publish(terminal, true)) as TerminalProtocolEvent;
  } catch (error) {
    const fallbackTerminal = fallback(error);
    try {
      return (await publisher.publish(
        fallbackTerminal,
        true
      )) as TerminalProtocolEvent;
    } catch (fallbackError) {
      // A failed sink is disabled by publish. If validation itself unexpectedly
      // fails here, prepare throws and exposing no outcome is safer than emitting
      // an envelope which violates the public protocol.
      const safe = publisher.prepare(
        fallback(fallbackError)
      ) as TerminalProtocolEvent;
      publisher.retain(safe);
      return safe;
    }
  }
}

/** Converts adapter/parser failures into the same versioned terminal protocol. */
export async function createFailureOutcome(
  options: CreateFailureOutcomeOptions
): Promise<ExecutionOutcome> {
  const identity = resolveOperationId(options.operationId);
  const operationId = identity.operationId;
  const clock = createSafeClock(options.now);
  const started = clock.read();
  const executionRedaction = createExecutionRedactor(options.redaction);
  const { redact } = executionRedaction;
  const publisher = createPublisher(
    redact,
    options.sink,
    options.captureEvents ?? true
  );
  const protocolFailure = clock.failure() ?? identity.failure;
  let normalized = normalizeError(
    protocolFailure ??
      (options.cancelled === true
        ? new DOMException('The operation was cancelled.', 'AbortError')
        : options.error),
    protocolFailure === undefined && options.cancelled === true
      ? AbortSignal.abort(options.error)
      : undefined,
    options.debug,
    redact
  );
  let warnings: OperationWarning[] = [];

  try {
    await publisher.publish({
      protocolVersion: PROTOCOL_VERSION,
      event: 'operation.started',
      operationId,
      commandId: options.commandId,
      timestamp: started.toISOString(),
    });
    warnings = safeWarnings(options.warnings, redact);
    if (clock.failure() !== undefined) {
      normalized = normalizeError(
        clock.failure(),
        undefined,
        options.debug,
        redact
      );
      warnings = [];
    }
  } catch (error) {
    normalized = normalizeError(error, undefined, options.debug, redact);
    warnings = [];
  }

  const completed = clock.read();
  if (clock.failure() !== undefined) {
    normalized = normalizeError(
      clock.failure(),
      undefined,
      options.debug,
      redact
    );
    warnings = [];
  }
  const durationMs = Math.max(0, completed.getTime() - started.getTime());
  const makeTerminal = (
    status: 'failed' | 'cancelled',
    error: StructuredError
  ): TerminalProtocolEvent => ({
    protocolVersion: PROTOCOL_VERSION,
    event: status === 'cancelled' ? 'operation.cancelled' : 'operation.failed',
    operationId,
    commandId: options.commandId,
    timestamp: completed.toISOString(),
    durationMs,
    error,
    ...(warnings.length === 0 ? {} : { warnings }),
  });
  let terminalStatus = normalized.status;
  let terminalError = normalized.error;
  const terminal = await finalizeTerminal(
    publisher,
    makeTerminal(terminalStatus, terminalError),
    (error) => {
      const fallback = normalizeError(error, undefined, options.debug, redact);
      terminalStatus = 'failed';
      terminalError = fallback.error;
      return makeTerminal('failed', fallback.error);
    }
  );

  const outcome: ExecutionOutcome = {
    status: terminalStatus,
    commandId: options.commandId,
    operationId,
    startedAt: started.toISOString(),
    completedAt: completed.toISOString(),
    durationMs,
    error: terminalError,
    ...(warnings.length === 0 ? {} : { warnings }),
    terminalEvent: terminal,
    protocolEvents: publisher.transcript,
  };
  assertOutcome(outcome);
  return outcome;
}

export async function executeCommand(
  registry: CommandRegistry,
  commandOrId: CommandDefinition | string,
  input: unknown,
  options: ExecuteCommandOptions
): Promise<ExecutionOutcome> {
  const command = registry.requireById(
    typeof commandOrId === 'string' ? commandOrId : commandOrId.id
  );
  const signal = options.signal ?? new AbortController().signal;
  const identity = resolveOperationId(options.operationId);
  const operationId = identity.operationId;
  const clock = createSafeClock(options.now);
  const now = clock.read;
  const started = now();
  const env = options.env ?? {};
  const executionRedaction = createExecutionRedactor(
    options.redaction,
    env,
    commandSensitiveValues(command, input, env)
  );
  const { redact } = executionRedaction;
  const publisher = createPublisher(
    redact,
    options.sink,
    options.captureEvents ?? true
  );
  let eventReporterSealed = false;
  let eventTail: Promise<void> = Promise.resolve();
  let eventFailure: unknown;
  let hasEventFailure = false;

  const enqueueDomainEvent = (domainEvent: unknown): Promise<void> => {
    if (eventReporterSealed) {
      const rejected: Promise<void> = Promise.reject(
        new ContractError(
          'CLI_EVENT_REPORTER_CLOSED',
          `Command "${command.id}" emitted an event after its operation was sealed.`
        )
      );
      // Detached work may ignore this promise. Attaching a handler prevents an
      // unhandled rejection while callers which await it still observe failure.
      void rejected.catch((): void => undefined);
      return rejected;
    }

    const queued = eventTail.then(async () => {
      if (hasEventFailure) throw eventFailure;
      assertJsonValue(domainEvent);
      const issues = registry.validateEvent(command.id, domainEvent);
      if (issues.length > 0) {
        throw new ContractError(
          'CLI_EVENT_CONTRACT_VIOLATION',
          `Command "${command.id}" emitted an invalid event.`,
          { issues }
        );
      }
      const eventName = (domainEvent as { event?: unknown }).event;
      if (typeof eventName !== 'string' || RESERVED_EVENTS.has(eventName)) {
        throw new ContractError(
          'CLI_EVENT_NAME_RESERVED',
          `Command "${command.id}" emitted a reserved or invalid event name.`
        );
      }
      const event = domainEvent as Record<string, unknown>;
      const reserved = Object.keys(event).filter(
        (key) => key !== 'event' && RESERVED_DOMAIN_FIELDS.has(key)
      );
      if (reserved.length > 0) {
        throw new ContractError(
          'CLI_EVENT_FIELD_RESERVED',
          `Command "${command.id}" emitted reserved protocol fields.`,
          { fields: reserved }
        );
      }
      const safeEvent = redact(event);
      assertJsonValue(safeEvent);
      const redactedIssues = registry.validateEvent(command.id, safeEvent);
      if (redactedIssues.length > 0) {
        throw new ContractError(
          'CLI_EVENT_REDACTION_CONTRACT_VIOLATION',
          `Redaction made an event from "${command.id}" invalid.`,
          { issues: redactedIssues }
        );
      }
      await publisher.publish({
        ...safeEvent,
        protocolVersion: PROTOCOL_VERSION,
        event: eventName,
        operationId,
        commandId: command.id,
        timestamp: now().toISOString(),
      });
    });

    // The tail itself always settles so calls retain invocation order. The
    // first failure is drained into the operation even if emit was not awaited.
    eventTail = queued.then(
      (): void => undefined,
      (failure) => {
        if (!hasEventFailure) {
          hasEventFailure = true;
          eventFailure = failure;
        }
      }
    );
    return queued;
  };

  let result: OperationResult<unknown> | undefined;
  let error: StructuredError | undefined;
  let status: ExecutionOutcome['status'] = 'failed';
  let warnings: OperationWarning[] = [];

  try {
    await publisher.publish({
      protocolVersion: PROTOCOL_VERSION,
      event: 'operation.started',
      operationId,
      commandId: command.id,
      timestamp: started.toISOString(),
    });
    warnings = safeWarnings(options.initialWarnings, redact);
    if (identity.failure !== undefined) throw identity.failure;
    if (clock.failure() !== undefined) throw clock.failure();

    const inputIssues = registry.validateInput(command.id, input);
    if (inputIssues.length > 0) {
      throw new CliError({
        code: 'CLI_INPUT_INVALID',
        category: 'validation',
        message: `Input for "${command.path.join(' ')}" is invalid.`,
        path: inputIssues[0]?.path,
        details: { issues: inputIssues },
      });
    }
    assertJsonValue(input);
    assertCapabilities(command, options.capabilities);
    const context = createOperationContext({
      cwd: options.cwd,
      mode: options.mode,
      env,
      signal,
      operationId,
      now,
      capabilities: options.capabilities,
      registerSensitiveValue: executionRedaction.registerSensitiveValue,
      events: {
        emit: enqueueDomainEvent,
      },
    });
    if (signal.aborted)
      throw (
        signal.reason ??
        new DOMException('The operation was cancelled.', 'AbortError')
      );
    let rawResult: OperationResult<unknown> | undefined;
    let commandFailure: unknown;
    let commandFailed = false;
    try {
      rawResult = await command.execute(input as never, context as never);
    } catch (caught) {
      commandFailed = true;
      commandFailure = caught;
    }
    eventReporterSealed = true;
    await eventTail;
    if (hasEventFailure) throw eventFailure;
    if (clock.failure() !== undefined) throw clock.failure();
    if (commandFailed) throw commandFailure;

    assertOperationResultMetadata(rawResult!);
    assertRegisteredNextActions(
      registry,
      rawResult!.nextActions,
      `Result from "${command.id}"`
    );
    warnings = [...warnings, ...safeWarnings(rawResult!.warnings, redact)];
    const rawResultWithWarnings: OperationResult<unknown> = {
      ...rawResult!,
      ...(warnings.length === 0 ? { warnings: undefined } : { warnings }),
    };
    if (rawResultWithWarnings.warnings === undefined)
      delete rawResultWithWarnings.warnings;
    const rawIssues = registry.validateResult(
      command.id,
      rawResultWithWarnings
    );
    if (rawIssues.length > 0) {
      throw new ContractError(
        'CLI_OUTPUT_CONTRACT_VIOLATION',
        `Command "${command.id}" returned a result which does not match its output schema.`,
        { issues: rawIssues }
      );
    }
    assertJsonValue(rawResultWithWarnings);
    const safeResult = redact(rawResultWithWarnings);
    assertJsonValue(safeResult);
    assertRegisteredNextActions(
      registry,
      safeResult.nextActions,
      `Redacted result from "${command.id}"`
    );
    const safeIssues = registry.validateResult(command.id, safeResult);
    if (safeIssues.length > 0) {
      throw new ContractError(
        'CLI_OUTPUT_REDACTION_CONTRACT_VIOLATION',
        `Redaction made the result from "${command.id}" invalid.`,
        { issues: safeIssues }
      );
    }
    result = safeResult;
    status = 'completed';
  } catch (caught) {
    eventReporterSealed = true;
    let errorToNormalize = clock.failure() ?? caught;
    try {
      if (caught instanceof CliError) {
        assertRegisteredNextActions(
          registry,
          caught.nextActions,
          `Error from "${command.id}"`
        );
      }
    } catch (contractFailure) {
      errorToNormalize = contractFailure;
    }
    let normalized = normalizeError(
      errorToNormalize,
      signal,
      options.debug,
      redact
    );
    try {
      assertRegisteredNextActions(
        registry,
        normalized.error.nextActions,
        `Redacted error from "${command.id}"`
      );
    } catch (contractFailure) {
      normalized = normalizeError(
        contractFailure,
        undefined,
        options.debug,
        redact
      );
    }
    status = normalized.status;
    error = normalized.error;
  }

  const completed = now();
  if (clock.failure() !== undefined) {
    const normalized = normalizeError(
      clock.failure(),
      undefined,
      options.debug,
      redact
    );
    status = normalized.status;
    error = normalized.error;
    result = undefined;
  }
  const durationMs = Math.max(0, completed.getTime() - started.getTime());
  const terminalFor = (
    terminalStatus: ExecutionOutcome['status'],
    terminalError: StructuredError | undefined,
    terminalResult: OperationResult<unknown> | undefined
  ): TerminalProtocolEvent =>
    terminalStatus === 'completed'
      ? {
          protocolVersion: PROTOCOL_VERSION,
          event: 'operation.completed',
          operationId,
          commandId: command.id,
          timestamp: completed.toISOString(),
          durationMs,
          result: terminalResult!,
        }
      : {
          protocolVersion: PROTOCOL_VERSION,
          event:
            terminalStatus === 'cancelled'
              ? 'operation.cancelled'
              : 'operation.failed',
          operationId,
          commandId: command.id,
          timestamp: completed.toISOString(),
          durationMs,
          error: terminalError!,
          ...(warnings.length === 0 ? {} : { warnings }),
        };

  const terminal = await finalizeTerminal(
    publisher,
    terminalFor(status, error, result),
    (terminalFailure) => {
      const fallback = normalizeError(
        terminalFailure,
        undefined,
        options.debug,
        redact
      );
      status = 'failed';
      error = fallback.error;
      result = undefined;
      return terminalFor(status, error, result);
    }
  );

  const outcome: ExecutionOutcome = {
    status,
    commandId: command.id,
    operationId,
    startedAt: started.toISOString(),
    completedAt: completed.toISOString(),
    durationMs,
    ...(result === undefined ? {} : { result }),
    ...(error === undefined ? {} : { error }),
    ...(status === 'completed' || warnings.length === 0 ? {} : { warnings }),
    terminalEvent: terminal,
    protocolEvents: publisher.transcript,
  };
  assertOutcome(outcome);
  return outcome;
}

export function exitCodeForOutcome(
  outcome: ExecutionOutcome
): 0 | 1 | 2 | 70 | 130 {
  if (outcome.status === 'completed') return 0;
  if (outcome.status === 'cancelled') return 130;
  if (
    outcome.error?.category === 'invocation' ||
    outcome.error?.category === 'validation'
  )
    return 2;
  if (outcome.error?.category === 'internal') return 70;
  return 1;
}
