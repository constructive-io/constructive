import type { PgClient } from '@dataplan/pg';

export async function queryI18nRow(
  client: Pick<PgClient, 'query'>,
  text: string,
  values: any[]
): Promise<Record<string, any> | null> {
  const { rows } = await client.query<Record<string, any>>({ text, values });
  return rows[0] ?? null;
}
