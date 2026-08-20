import { randomUUID } from 'node:crypto';

import { Type } from '@sinclair/typebox';

import {
  ApprovedCapabilities,
  CommandDefinition,
  ExecutionOutcome,
  ExecutionOutcomeSchema,
  NextAction,
  OperationWarning,
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
import { CommandRegistry } from './registry';
import { assertJsonValue, compileSchema } from './schema';

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

export interface SafeClock {
  read(): Date;
  failure(): ContractError | undefined;
}

export function createSafeClock(clock: (() => Date) | undefined): SafeClock {
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

export function resolveOperationId(value: unknown): {
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

function debugDetails(error: unknown): unknown {
  if (!(error instanceof Error)) return { thrown: error };
  return { name: error.name, message: error.message, stack: error.stack };
}

export function createExecutionRedactor(
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

export function commandSensitiveValues(
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

export function createPublisher(
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

export function safeWarnings(
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

export function normalizeError(
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

export function assertOutcome(outcome: ExecutionOutcome): void {
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

export function assertCapabilities(
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

export function assertRegisteredNextActions(
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

export async function finalizeTerminal(
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
