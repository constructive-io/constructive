import {
  CommandDefinition,
  ExecutionOutcome,
  OutputFormat,
  ProtocolEvent,
  ProtocolEventSink,
} from './contracts';
import { InvocationError } from './errors';

export interface RenderedExecution {
  stdout: string;
  stderr: string;
}

function jsonStringify(value: unknown, indentation?: number): string {
  const serialized = JSON.stringify(
    value,
    (_key, item) => (typeof item === 'bigint' ? item.toString() : item),
    indentation
  );
  if (serialized === undefined)
    throw new Error('Value cannot be represented as JSON.');
  return serialized;
}

export function serializeProtocolEvent(event: ProtocolEvent): string {
  return jsonStringify(event);
}

export function createJsonlSink(
  write: (line: string) => void | Promise<void>
): ProtocolEventSink {
  return async (event) => {
    await write(`${serializeProtocolEvent(event)}\n`);
  };
}

export function assertFormatAllowed(
  command: CommandDefinition,
  format: OutputFormat
): void {
  if (command.lifecycle === 'long-running' && format === 'json') {
    throw new InvocationError(
      'CLI_FORMAT_UNSUPPORTED',
      `Long-running command "${command.path.join(' ')}" requires --format jsonl or human.`
    );
  }
}

function terminalEvent(outcome: ExecutionOutcome): ProtocolEvent {
  const event = outcome.terminalEvent;
  if (outcome.protocolEvents.length === 0) return event;
  const terminalEvents = outcome.protocolEvents.filter((item) =>
    ['operation.completed', 'operation.failed', 'operation.cancelled'].includes(
      item.event
    )
  );
  if (
    event === undefined ||
    terminalEvents.length !== 1 ||
    ![
      'operation.completed',
      'operation.failed',
      'operation.cancelled',
    ].includes(event.event)
  ) {
    throw new Error(
      'Execution outcome does not contain exactly one terminal event.'
    );
  }
  return event;
}

export function renderExecution(
  outcome: ExecutionOutcome,
  format: OutputFormat,
  renderHumanResult?: (
    result: NonNullable<ExecutionOutcome['result']>
  ) => string
): RenderedExecution {
  if (format === 'json') {
    return {
      stdout: `${serializeProtocolEvent(terminalEvent(outcome))}\n`,
      stderr: '',
    };
  }
  if (format === 'jsonl') {
    if (outcome.protocolEvents.length === 0) {
      throw new Error(
        'JSONL rendering requires event transcript capture or a streaming sink.'
      );
    }
    return {
      stdout:
        outcome.protocolEvents
          .map((event) => serializeProtocolEvent(event))
          .join('\n') + '\n',
      stderr: '',
    };
  }

  if (outcome.status === 'completed') {
    const result = outcome.result!;
    const output =
      renderHumanResult === undefined
        ? typeof result.data === 'string'
          ? result.data
          : jsonStringify(result.data, 2)
        : renderHumanResult(result);
    const stderr = (result.warnings ?? [])
      .map((warning) => `Warning [${warning.code}]: ${warning.message}`)
      .join('\n');
    return {
      stdout: output.length === 0 ? '' : `${output}\n`,
      stderr: stderr.length === 0 ? '' : `${stderr}\n`,
    };
  }

  const error = outcome.error!;
  const warnings = (outcome.warnings ?? [])
    .map((warning) => `Warning [${warning.code}]: ${warning.message}`)
    .join('\n');
  return {
    stdout: '',
    stderr: `${warnings.length === 0 ? '' : `${warnings}\n`}Error [${error.code}]: ${error.message}\n`,
  };
}
