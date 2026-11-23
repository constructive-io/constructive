import type { PgClient, PgCodec, PgResource } from '@dataplan/pg';
import { pgSelect, TYPES } from '@dataplan/pg';
import type { Step } from 'grafast';
import { lambda } from 'grafast';
import sql from 'pg-sql2';
import type { SQL, SQLRawValue } from 'pg-sql2';

function returningAttributes(codec: PgCodec) {
  return Object.entries(codec.attributes).filter(([, attribute]) => !attribute.expression && !attribute.via);
}

function jsonRecordValue(codec: PgCodec, value: SQL): SQL {
  while (codec.domainOfCodec) codec = codec.domainOfCodec;
  return sql.isEquivalent(codec.sqlType, TYPES.json.sqlType) || sql.isEquivalent(codec.sqlType, TYPES.jsonb.sqlType)
    ? sql`(${value})::json`
    : sql`to_json(${value})`;
}

export async function selectReturningRecords(
  pgClient: PgClient,
  from: SQL,
  codec: PgCodec,
  pkColumns: readonly string[],
  pkRows: Record<string, unknown>[]
): Promise<unknown[]> {
  if (pkRows.length === 0) return [];

  const alias = sql.identifier('__bulk_returning');
  const attributes = returningAttributes(codec);
  const columns = attributes.map(([name, attribute], index) => {
    const column = sql`${alias}.${sql.identifier(name)}`;
    const encoded = attribute.codec.castFromPg
      ? attribute.codec.castFromPg(column, !!attribute.notNull)
      : sql`${column}::text`;
    return sql`${encoded} AS ${sql.identifier(String(index))}`;
  });
  const conditions = pkRows.map((row) => sql`(${sql.join(
    pkColumns.map((column) => sql`${alias}.${sql.identifier(column)} = ${sql.value(row[column] as SQLRawValue)}`),
    ' AND '
  )})`);
  const result = await pgClient.query<Record<string, string | null>>(sql.compile(sql`
    SELECT ${sql.join(columns, ', ')}
    FROM ${from} AS ${alias}
    WHERE ${sql.join(conditions, ' OR ')}
  `));
  return result.rows.map((row) => Object.fromEntries(attributes.map(([name, attribute], index) => [
    name,
    row[index] == null ? null : attribute.codec.fromPg(row[index])
  ])));
}

export function pgSelectReturningRecords(resource: PgResource, $records: Step) {
  const attributes = returningAttributes(resource.codec);
  const $encoded = lambda($records, (records: Record<string, unknown>[]) => records.map((record) =>
    attributes.map(([name, attribute]) => {
      const value = record[name];
      const encoded = value == null ? null : attribute.codec.toPg(value);
      return encoded == null ? null : String(encoded);
    })
  ), true);
  const alias = sql.identifier('__bulk_records');
  const row = sql`${alias}."value"`;
  const fields = sql.identifier('__bulk_attributes');
  const entries = attributes.map(([name, attribute], index) => sql`(
    ${sql.literal(name)},
    ${jsonRecordValue(attribute.codec, sql`${row}->>${sql.literal(index)}`)}
  )`);
  return pgSelect({
    resource,
    identifiers: [],
    args: [{ step: $encoded, pgCodec: TYPES.json }],
    from: (records) => sql`json_populate_recordset(
      NULL::${resource.codec.sqlType},
      (
        SELECT coalesce(json_agg((
          SELECT json_object_agg(${fields}."key", ${fields}."value")
          FROM (VALUES ${sql.join(entries, ', ')}) AS ${fields}("key", "value")
        )), '[]'::json)
        FROM json_array_elements(${records.placeholder}) AS ${alias}("value")
      )
    )`
  });
}
