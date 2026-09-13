import {
  assertCompletePgSettings,
  type PgSettings,
} from '@constructive-io/express-context';
import type { PgClient, WithPgClient } from '@dataplan/pg';

export function assertGraphileRequestContext(
  withPgClient: unknown,
  pgSettings: unknown,
  label: string
): asserts pgSettings is PgSettings {
  if (typeof withPgClient !== 'function') {
    throw new Error(`${label}_PG_CLIENT_CONTEXT_UNAVAILABLE`);
  }
  assertCompletePgSettings(pgSettings, `${label} pgSettings`);
}

/** Run request-lane SQL with the complete Graphile request settings. */
export async function withGraphileRequestPgClient<T>(
  withPgClient: unknown,
  pgSettings: unknown,
  callback: (client: PgClient) => T | Promise<T>,
  label: string
): Promise<T> {
  assertGraphileRequestContext(withPgClient, pgSettings, label);
  return (withPgClient as WithPgClient)(pgSettings as PgSettings, callback);
}
