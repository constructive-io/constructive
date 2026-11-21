import type { PgClient, PgCodec } from '@dataplan/pg';
import sql from 'pg-sql2';
import type { SQL, SQLRawValue } from 'pg-sql2';

export async function selectReturningRecords(
  pgClient: PgClient,
  from: SQL,
  codec: PgCodec,
  pkColumns: readonly string[],
  pkRows: Record<string, unknown>[]
): Promise<unknown[]> {
  if (pkRows.length === 0) return [];

  const alias = sql.identifier('__bulk_returning');
  const record = sql`(${alias}.*)`;
  const encoded = codec.castFromPg
    ? codec.castFromPg(record, true)
    : sql`${record}::text`;
  const conditions = pkRows.map((row) => sql`(${sql.join(
    pkColumns.map((column) => sql`${alias}.${sql.identifier(column)} = ${sql.value(row[column] as SQLRawValue)}`),
    ' AND '
  )})`);
  const result = await pgClient.query<{ __record: string }>(sql.compile(sql`
    SELECT ${encoded} AS "__record"
    FROM ${from} AS ${alias}
    WHERE ${sql.join(conditions, ' OR ')}
  `));
  return result.rows.map((row) => codec.fromPg(row.__record));
}
