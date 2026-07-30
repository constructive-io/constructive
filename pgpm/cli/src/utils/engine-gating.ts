import { PgpmDriverCapabilities } from '@pgpmjs/types';

import { ResolvedEngine } from './engine';

/**
 * Commands that need a capability the backend may not have. Gating is declared
 * here rather than branching per backend inside each command, so a new driver
 * plugin only has to describe itself through {@link PgpmDriverCapabilities}.
 */
const COMMAND_REQUIREMENTS: Record<string, keyof PgpmDriverCapabilities> = {
  docker: 'serverLifecycle',
  kill: 'serverLifecycle',
  tune: 'serverLifecycle',
  'admin-users': 'multiConnection',
  dump: 'dump',
};

const REQUIREMENT_REASONS: Record<keyof PgpmDriverCapabilities, string> = {
  createdb: 'it cannot create databases (the instance is the database)',
  dump: 'it has no pg_dump',
  serverLifecycle: 'it has no server to manage',
  multiConnection: 'it is a single-session backend',
};

/**
 * The reason a command cannot run on the active engine, or undefined when it can.
 */
export const engineCommandBlocker = (
  command: string,
  engine: ResolvedEngine,
  capabilities: PgpmDriverCapabilities
): string | undefined => {
  const requirement = COMMAND_REQUIREMENTS[command];
  if (!requirement || capabilities[requirement]) return undefined;
  return (
    `pgpm ${command} is not supported by the "${engine.name}" engine — ` +
    `${REQUIREMENT_REASONS[requirement]}.`
  );
};
