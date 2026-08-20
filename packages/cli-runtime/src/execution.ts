import {
  ApprovedCapabilities,
  CommandDefinition,
  ExecutionMode,
  ExecutionOutcome,
  OperationResult,
  OperationWarning,
  PROTOCOL_VERSION,
  ProtocolEventSink,
  StructuredError,
  TerminalProtocolEvent,
} from './contracts';
import { CliError, ContractError } from './errors';
import {
  assertCapabilities,
  assertOutcome,
  assertRegisteredNextActions,
  commandSensitiveValues,
  createExecutionRedactor,
  createPublisher,
  createSafeClock,
  finalizeTerminal,
  normalizeError,
  resolveOperationId,
  safeWarnings,
} from './execution-support';
import { createOperationContext } from './operation-context';
import { RedactionOptions } from './redaction';
import { assertOperationResultMetadata, CommandRegistry } from './registry';
import { assertJsonValue } from './schema';

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
