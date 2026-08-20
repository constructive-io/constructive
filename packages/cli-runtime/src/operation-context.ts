import { randomUUID } from 'node:crypto';
import { isAbsolute } from 'node:path';

import {
  type ApprovedCapabilities,
  type ExecutionMode,
  type OperationContext,
} from './contracts';
import { ContractError } from './errors';

export interface CreateOperationContextOptions<TEvent = unknown> {
  cwd: string;
  mode: ExecutionMode;
  env: Readonly<Record<string, string | undefined>>;
  signal: AbortSignal;
  operationId?: string;
  now?: () => Date;
  events?: { emit(event: TEvent): Promise<void> };
  capabilities?: Partial<ApprovedCapabilities>;
  registerSensitiveValue?: (value: string) => void;
}

export function createOperationContext<TEvent = unknown>(
  options: CreateOperationContextOptions<TEvent>
): OperationContext<TEvent> {
  if (!isAbsolute(options.cwd)) {
    throw new ContractError(
      'CLI_CWD_NOT_ABSOLUTE',
      'OperationContext.cwd must be an absolute path.',
      {
        cwd: options.cwd,
      }
    );
  }
  const env = Object.freeze({ ...options.env });
  const capabilities: ApprovedCapabilities = Object.freeze({
    yes: options.capabilities?.yes ?? false,
    ...(options.capabilities?.dryRun === undefined
      ? {}
      : { dryRun: options.capabilities.dryRun }),
    ...(options.capabilities?.idempotencyKey === undefined
      ? {}
      : { idempotencyKey: options.capabilities.idempotencyKey }),
    acknowledgedRisks: Object.freeze([
      ...(options.capabilities?.acknowledgedRisks ?? []),
    ]),
  });
  return Object.freeze({
    cwd: options.cwd,
    mode: options.mode,
    env,
    signal: options.signal,
    operationId: options.operationId ?? randomUUID(),
    now: options.now ?? (() => new Date()),
    events: options.events ?? { emit: async () => undefined },
    capabilities,
    registerSensitiveValue(value: string): void {
      if (typeof value !== 'string') {
        throw new ContractError(
          'CLI_SENSITIVE_VALUE_INVALID',
          'Sensitive values registered by an operation must be strings.'
        );
      }
      if (value.length > 0) options.registerSensitiveValue?.(value);
    },
  });
}
