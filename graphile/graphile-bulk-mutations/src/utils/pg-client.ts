import type { PgClient, PgClientResult } from '@dataplan/pg';

/** Execute SQL using @dataplan/pg's native query-config contract. */
export function queryPgClient<TData>(
  client: Pick<PgClient, 'query'>,
  text: string,
  values: any[]
): Promise<PgClientResult<TData>> {
  return client.query<TData>({ text, values });
}
