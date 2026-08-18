import {
  assertCompletePgSettings,
  type PgSettings,
} from '@constructive-io/express-context';
import type { PgClient } from '@dataplan/pg';

export type GraphileWithPgClient = <T>(
  pgSettings: PgSettings,
  callback: (client: PgClient) => Promise<T>
) => Promise<T>;

export async function queryI18nWithContext(
  withPgClient: unknown,
  pgSettings: unknown,
  id: unknown,
  text: string,
  values: any[]
): Promise<Record<string, unknown> | null> {
  if (typeof withPgClient !== 'function') {
    throw new Error('I18N_PG_CLIENT_CONTEXT_UNAVAILABLE');
  }
  assertCompletePgSettings(pgSettings, 'i18n pgSettings');
  if (id === null || id === undefined) {
    // Preserve the plugin's existing base-row fallback when the parent has no
    // usable key; there is no request-lane SQL to authorize in this case.
    return null;
  }

  return (withPgClient as GraphileWithPgClient)(pgSettings, async (client) => {
    const { rows } = await client.query<Record<string, unknown>>({
      text,
      values,
    });
    return rows[0] ?? null;
  });
}
