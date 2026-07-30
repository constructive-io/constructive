/**
 * PostGraphile v5 History Plugin
 *
 * Discovers tables tagged with `@history` (companion `<table>_history` tables
 * produced by the constructive-db `DataHistory` module) and augments the schema
 * with:
 *   - a `history` connection field on each source row type — the row's full
 *     version stream ordered by `recorded_at DESC`;
 *   - a `versionAt(at: Datetime!)` field returning the version that was current
 *     at a given point in time;
 *   - a `restore<Table>Version` root mutation that rewrites the live row from a
 *     historical version (optionally re-inserting a deleted row).
 *
 * All reads and writes go through the request's `withPgClient` + `pgSettings`,
 * so row-level security and mutation policies are enforced exactly as they are
 * for any other operation. Because restores write through the source table, the
 * source `DataHistory` trigger records the restore itself as a new version.
 *
 * Smart tag format (stamped by `metaschema_generators.data_history`):
 *   @history { "history_table": "posts_history", ... }
 * The tag value may also be a bare string naming the history table, or simply a
 * truthy marker (in which case the history table is derived by suffix).
 */

import 'graphile-build';
import 'graphile-build-pg';

import type { PgCodecWithAttributes } from '@dataplan/pg';
import { context as grafastContext, lambda, object } from 'grafast';
import type { GraphileConfig } from 'graphile-config';

import type { HistoryColumn, HistoryPluginOptions, HistoryTableInfo } from './types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace GraphileConfig {
    interface Plugins {
      HistoryPlugin: true;
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readHistoryTag(codec: PgCodecWithAttributes): string | true | false {
  const tags = (codec.extensions as any)?.tags;
  if (!tags) return false;
  const val = tags.history;
  if (val === undefined || val === null || val === false) return false;
  if (typeof val === 'string') {
    // Tag may be a bare table name or a JSON object encoded as a string.
    const trimmed = val.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed?.history_table ?? true;
      } catch {
        return trimmed.length > 0 ? trimmed : true;
      }
    }
    return trimmed.length > 0 ? trimmed : true;
  }
  if (typeof val === 'object') {
    return (val as any).history_table ?? true;
  }
  return true;
}

function resolvePgTypeName(codec: any): string {
  const name = codec?.name;
  if (name) return name;
  return 'text';
}

function pgTypeToGraphQLType(build: any, pgType: string): any {
  const {
    graphql: { GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean }
  } = build;
  const byName = (n: string) => build.getTypeByName(n);
  switch (pgType) {
  case 'uuid':
    return byName('UUID') ?? GraphQLString;
  case 'int2':
  case 'int4':
    return GraphQLInt;
  case 'int8':
    return byName('BigInt') ?? GraphQLString;
  case 'bool':
    return GraphQLBoolean;
  case 'float4':
  case 'float8':
    return GraphQLFloat;
  case 'numeric':
    return byName('BigFloat') ?? GraphQLString;
  case 'timestamptz':
  case 'timestamp':
  case 'date':
  case 'time':
  case 'timetz':
    return byName('Datetime') ?? GraphQLString;
  case 'json':
  case 'jsonb':
    return byName('JSON') ?? GraphQLString;
  default:
    return GraphQLString;
  }
}

function quoteIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

// ─── Plugin Factory ──────────────────────────────────────────────────────────

export function createHistoryPlugin(options: HistoryPluginOptions = {}): GraphileConfig.Plugin {
  const {
    historySuffix = '_history',
    recordedAtColumn = 'recorded_at',
    operationColumn = 'history_op',
    immutableColumns = ['created_at', 'updated_at']
  } = options;

  // Closure state shared across hooks
  let registry: Record<string, HistoryTableInfo> = {};
  const versionTypeCache: Record<string, any> = {};

  function getVersionType(build: any, info: HistoryTableInfo): any {
    const {
      graphql: { GraphQLObjectType, GraphQLString }
    } = build;
    const typeName = `${info.sourceTypeName}HistoryVersion`;
    if (versionTypeCache[typeName]) return versionTypeCache[typeName];

    const fieldsConfig: Record<string, any> = {};
    for (const col of info.copyColumns) {
      fieldsConfig[col.gqlName] = { type: pgTypeToGraphQLType(build, col.pgType) };
    }
    fieldsConfig.recordedAt = { type: build.getTypeByName('Datetime') ?? GraphQLString };
    fieldsConfig.historyOp = { type: GraphQLString };

    const type = new GraphQLObjectType({
      name: typeName,
      description: `A single historical version of a ${info.sourceTypeName} row.`,
      fields: fieldsConfig
    });
    versionTypeCache[typeName] = type;
    return type;
  }

  // Map a raw history row (physical column keys) to the GraphQL version shape.
  function mapVersionRow(info: HistoryTableInfo, row: Record<string, any> | null): Record<string, any> | null {
    if (!row) return null;
    const out: Record<string, any> = {};
    for (const col of info.copyColumns) {
      out[col.gqlName] = row[col.column] ?? null;
    }
    out.recordedAt = row[info.recordedAtColumn] ?? null;
    out.historyOp = row[info.operationColumn] ?? null;
    return out;
  }

  function selectColumnsSql(info: HistoryTableInfo): string {
    const cols = info.copyColumns.map((c) => quoteIdent(c.column));
    cols.push(quoteIdent(info.recordedAtColumn));
    cols.push(quoteIdent(info.operationColumn));
    return cols.join(', ');
  }

  return {
    name: 'HistoryPlugin',
    version: '1.0.0',

    schema: {
      hooks: {
        init: {
          callback(_, build) {
            registry = {};

            const pgResources = build.input.pgRegistry.pgResources;

            for (const [, resource] of Object.entries(pgResources)) {
              const r = resource as any;
              const codec = r.codec as PgCodecWithAttributes | undefined;
              if (!codec?.attributes) continue;

              const tagValue = readHistoryTag(codec);
              if (!tagValue) continue;

              const schemaName = r.extensions?.pg?.schemaName ?? codec.extensions?.pg?.schemaName ?? 'public';
              const sourceSqlName = codec.extensions?.pg?.name ?? r.name ?? codec.name;

              // Resolve history table name: explicit tag value, else suffix convention.
              const historyTableName =
                typeof tagValue === 'string' ? tagValue : `${sourceSqlName}${historySuffix}`;

              // Locate the history resource/codec by SQL name in the same schema.
              let historyCodec: PgCodecWithAttributes | null = null;
              for (const [, hres] of Object.entries(pgResources)) {
                const hr = hres as any;
                const hcodec = hr.codec as PgCodecWithAttributes | undefined;
                if (!hcodec?.attributes) continue;
                const hSchema = hr.extensions?.pg?.schemaName ?? hcodec.extensions?.pg?.schemaName ?? 'public';
                const hName = hcodec.extensions?.pg?.name ?? hr.name ?? hcodec.name;
                if (hName === historyTableName && hSchema === schemaName) {
                  historyCodec = hcodec;
                  break;
                }
              }
              if (!historyCodec) continue;

              // The history table must carry the reserved columns.
              if (!historyCodec.attributes[recordedAtColumn] || !historyCodec.attributes[operationColumn]) {
                continue;
              }

              // Primary key columns from the source resource's uniques.
              const uniques = r.uniques as Array<{ attributes: string[]; isPrimary?: boolean }> | undefined;
              const pk = uniques?.find((u) => u.isPrimary);
              if (!pk || pk.attributes.length === 0) continue;

              const pkColumns: HistoryColumn[] = pk.attributes.map((attr) => ({
                column: attr,
                gqlName: build.inflection.camelCase(attr),
                pgType: resolvePgTypeName((codec.attributes[attr] as any)?.codec)
              }));

              // Copied columns = history columns present on the source, minus reserved.
              const copyColumns: HistoryColumn[] = [];
              for (const [attrName, attr] of Object.entries(historyCodec.attributes)) {
                if (attrName === recordedAtColumn || attrName === operationColumn) continue;
                if (!codec.attributes[attrName]) continue;
                copyColumns.push({
                  column: attrName,
                  gqlName: build.inflection.camelCase(attrName),
                  pgType: resolvePgTypeName((attr as any).codec)
                });
              }
              if (copyColumns.length === 0) continue;

              const sourceTypeName = build.inflection.tableType(codec);

              registry[sourceTypeName] = {
                sourceTable: sourceSqlName,
                historyTable: historyTableName,
                schemaName,
                pkColumns,
                recordedAtColumn,
                operationColumn,
                copyColumns,
                sourceTypeName
              };
            }

            return _;
          }
        },

        GraphQLObjectType_fields(fields, build, context) {
          const {
            graphql: { GraphQLNonNull, GraphQLList, GraphQLBoolean, GraphQLInputObjectType, GraphQLObjectType, GraphQLString }
          } = build;
          const { scope } = context;

          // ── Root mutation: restore<Table>Version ────────────────────────────
          if (scope.isRootMutation) {
            const mutationFields: Record<string, any> = {};

            for (const info of Object.values(registry)) {
              const versionType = getVersionType(build, info);

              const inputFieldsConfig: Record<string, any> = {};
              for (const pk of info.pkColumns) {
                inputFieldsConfig[pk.gqlName] = {
                  type: new GraphQLNonNull(pgTypeToGraphQLType(build, pk.pgType))
                };
              }
              inputFieldsConfig.recordedAt = {
                type: new GraphQLNonNull(build.getTypeByName('Datetime') ?? GraphQLString)
              };
              inputFieldsConfig.reinsert = { type: GraphQLBoolean };

              const inputTypeName = `Restore${info.sourceTypeName}VersionInput`;
              const inputType = new GraphQLInputObjectType({
                name: inputTypeName,
                fields: inputFieldsConfig
              });

              const payloadTypeName = `Restore${info.sourceTypeName}VersionPayload`;
              const payloadType = new GraphQLObjectType({
                name: payloadTypeName,
                fields: {
                  version: { type: versionType },
                  restored: { type: versionType }
                }
              });

              const fieldName = `restore${info.sourceTypeName}Version`;

              mutationFields[fieldName] = {
                type: payloadType,
                args: {
                  input: { type: new GraphQLNonNull(inputType) }
                },
                plan(_$root: any, fieldArgs: any) {
                  const $input = fieldArgs.getRaw('input');
                  const $withPgClient = (grafastContext() as any).get('withPgClient');
                  const $pgSettings = (grafastContext() as any).get('pgSettings');
                  const $combined = object({
                    input: $input,
                    withPgClient: $withPgClient,
                    pgSettings: $pgSettings
                  });

                  return lambda($combined, async (vals: any) => {
                    const { input, withPgClient, pgSettings } = vals;
                    if (!withPgClient || !input) return null;

                    const schema = quoteIdent(info.schemaName);
                    const source = `${schema}.${quoteIdent(info.sourceTable)}`;
                    const history = `${schema}.${quoteIdent(info.historyTable)}`;

                    // 1. Locate the requested version (point-in-time: latest at/<= recordedAt).
                    const params: any[] = [];
                    const pkPredicates = info.pkColumns.map((pk) => {
                      params.push(input[pk.gqlName]);
                      return `${quoteIdent(pk.column)} = $${params.length}`;
                    });
                    params.push(input.recordedAt);
                    const atParam = `$${params.length}`;

                    const versionSql = `SELECT ${selectColumnsSql(info)}
                      FROM ${history}
                      WHERE ${pkPredicates.join(' AND ')}
                        AND ${quoteIdent(info.recordedAtColumn)} <= ${atParam}
                      ORDER BY ${quoteIdent(info.recordedAtColumn)} DESC
                      LIMIT 1`;

                    return withPgClient(pgSettings, async (pgClient: any) => {
                      const versionRes = await pgClient.query({ text: versionSql, values: params });
                      const versionRow = versionRes.rows[0] ?? null;
                      if (!versionRow) {
                        return { version: null, restored: null };
                      }

                      // 2. Columns we may write back: copied columns minus PK / immutable.
                      const pkNames = new Set(info.pkColumns.map((c) => c.column));
                      const immutable = new Set(immutableColumns);
                      const writable = info.copyColumns.filter(
                        (c) => !pkNames.has(c.column) && !immutable.has(c.column)
                      );

                      // 3. Does the live row still exist?
                      const existsParams: any[] = [];
                      const existsPreds = info.pkColumns.map((pk) => {
                        existsParams.push(input[pk.gqlName]);
                        return `${quoteIdent(pk.column)} = $${existsParams.length}`;
                      });
                      const existsRes = await pgClient.query({
                        text: `SELECT 1 FROM ${source} WHERE ${existsPreds.join(' AND ')} LIMIT 1`,
                        values: existsParams
                      });
                      const rowExists = existsRes.rows.length > 0;

                      if (rowExists) {
                        if (writable.length > 0) {
                          const setParams: any[] = [];
                          const setClauses = writable.map((c) => {
                            setParams.push(versionRow[c.column] ?? null);
                            return `${quoteIdent(c.column)} = $${setParams.length}`;
                          });
                          const wherePreds = info.pkColumns.map((pk) => {
                            setParams.push(input[pk.gqlName]);
                            return `${quoteIdent(pk.column)} = $${setParams.length}`;
                          });
                          await pgClient.query({
                            text: `UPDATE ${source} SET ${setClauses.join(', ')} WHERE ${wherePreds.join(' AND ')}`,
                            values: setParams
                          });
                        }
                      } else if (input.reinsert) {
                        const insertCols = info.copyColumns.filter((c) => !immutable.has(c.column));
                        const insParams: any[] = [];
                        const placeholders = insertCols.map((c) => {
                          insParams.push(versionRow[c.column] ?? null);
                          return `$${insParams.length}`;
                        });
                        await pgClient.query({
                          text: `INSERT INTO ${source} (${insertCols
                            .map((c) => quoteIdent(c.column))
                            .join(', ')}) VALUES (${placeholders.join(', ')})`,
                          values: insParams
                        });
                      } else {
                        // Row is deleted and reinsert not requested — nothing to restore.
                        return { version: mapVersionRow(info, versionRow), restored: null };
                      }

                      // 4. Re-read the current source row to report the restored state.
                      const curParams: any[] = [];
                      const curPreds = info.pkColumns.map((pk) => {
                        curParams.push(input[pk.gqlName]);
                        return `${quoteIdent(pk.column)} = $${curParams.length}`;
                      });
                      const curCols = info.copyColumns.map((c) => quoteIdent(c.column)).join(', ');
                      const curRes = await pgClient.query({
                        text: `SELECT ${curCols} FROM ${source} WHERE ${curPreds.join(' AND ')} LIMIT 1`,
                        values: curParams
                      });
                      const curRow = curRes.rows[0] ?? null;
                      const restored = curRow
                        ? (() => {
                          const out: Record<string, any> = {};
                          for (const c of info.copyColumns) out[c.gqlName] = curRow[c.column] ?? null;
                          out.recordedAt = null;
                          out.historyOp = null;
                          return out;
                        })()
                        : null;

                      return { version: mapVersionRow(info, versionRow), restored };
                    });
                  });
                }
              };
            }

            if (Object.keys(mutationFields).length === 0) return fields;
            return build.extend(fields, mutationFields, 'Adding history restore mutations');
          }

          // ── Source row type: history + versionAt ────────────────────────────
          if (!scope.pgCodec || !scope.isPgClassType) return fields;

          const codec = scope.pgCodec as PgCodecWithAttributes;
          const sourceTypeName = build.inflection.tableType(codec);
          const info = registry[sourceTypeName];
          if (!info) return fields;

          const versionType = getVersionType(build, info);

          const historyQualified = `${quoteIdent(info.schemaName)}.${quoteIdent(info.historyTable)}`;
          const orderClause = `ORDER BY ${quoteIdent(info.recordedAtColumn)} DESC`;

          function planParentPk($parent: any) {
            const pkSteps: Record<string, any> = {};
            for (const pk of info.pkColumns) {
              pkSteps[`pk_${pk.column}`] = $parent.get(pk.column);
            }
            return pkSteps;
          }

          return build.extend(
            fields,
            {
              history: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(versionType))),
                description: `Full version history of this ${info.sourceTypeName}, newest first.`,
                plan($parent: any) {
                  const $withPgClient = (grafastContext() as any).get('withPgClient');
                  const $pgSettings = (grafastContext() as any).get('pgSettings');
                  const $combined = object({
                    withPgClient: $withPgClient,
                    pgSettings: $pgSettings,
                    ...planParentPk($parent)
                  });
                  return lambda($combined, async (vals: any) => {
                    const { withPgClient, pgSettings } = vals;
                    if (!withPgClient) return [];
                    const params: any[] = [];
                    const preds = info.pkColumns.map((pk) => {
                      params.push(vals[`pk_${pk.column}`]);
                      return `${quoteIdent(pk.column)} = $${params.length}`;
                    });
                    const sql = `SELECT ${selectColumnsSql(info)} FROM ${historyQualified}
                      WHERE ${preds.join(' AND ')} ${orderClause}`;
                    const rows = await withPgClient(pgSettings, async (pgClient: any) => {
                      const res = await pgClient.query({ text: sql, values: params });
                      return res.rows;
                    });
                    return rows.map((row: any) => mapVersionRow(info, row));
                  });
                }
              },
              versionAt: {
                type: versionType,
                description: `The version of this ${info.sourceTypeName} that was current at the given time.`,
                args: {
                  at: { type: new GraphQLNonNull(build.getTypeByName('Datetime') ?? GraphQLString) }
                },
                plan($parent: any, fieldArgs: any) {
                  const $at = fieldArgs.getRaw('at');
                  const $withPgClient = (grafastContext() as any).get('withPgClient');
                  const $pgSettings = (grafastContext() as any).get('pgSettings');
                  const $combined = object({
                    at: $at,
                    withPgClient: $withPgClient,
                    pgSettings: $pgSettings,
                    ...planParentPk($parent)
                  });
                  return lambda($combined, async (vals: any) => {
                    const { at, withPgClient, pgSettings } = vals;
                    if (!withPgClient) return null;
                    const params: any[] = [];
                    const preds = info.pkColumns.map((pk) => {
                      params.push(vals[`pk_${pk.column}`]);
                      return `${quoteIdent(pk.column)} = $${params.length}`;
                    });
                    params.push(at);
                    const atParam = `$${params.length}`;
                    const sql = `SELECT ${selectColumnsSql(info)} FROM ${historyQualified}
                      WHERE ${preds.join(' AND ')}
                        AND ${quoteIdent(info.recordedAtColumn)} <= ${atParam}
                      ${orderClause} LIMIT 1`;
                    const row = await withPgClient(pgSettings, async (pgClient: any) => {
                      const res = await pgClient.query({ text: sql, values: params });
                      return res.rows[0] ?? null;
                    });
                    return mapVersionRow(info, row);
                  });
                }
              },
              versionsBetween: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(versionType))),
                description: `Versions of this ${info.sourceTypeName} recorded within the given time window (inclusive), newest first.`,
                args: {
                  from: { type: new GraphQLNonNull(build.getTypeByName('Datetime') ?? GraphQLString) },
                  to: { type: new GraphQLNonNull(build.getTypeByName('Datetime') ?? GraphQLString) }
                },
                plan($parent: any, fieldArgs: any) {
                  const $from = fieldArgs.getRaw('from');
                  const $to = fieldArgs.getRaw('to');
                  const $withPgClient = (grafastContext() as any).get('withPgClient');
                  const $pgSettings = (grafastContext() as any).get('pgSettings');
                  const $combined = object({
                    from: $from,
                    to: $to,
                    withPgClient: $withPgClient,
                    pgSettings: $pgSettings,
                    ...planParentPk($parent)
                  });
                  return lambda($combined, async (vals: any) => {
                    const { from, to, withPgClient, pgSettings } = vals;
                    if (!withPgClient) return [];
                    const params: any[] = [];
                    const preds = info.pkColumns.map((pk) => {
                      params.push(vals[`pk_${pk.column}`]);
                      return `${quoteIdent(pk.column)} = $${params.length}`;
                    });
                    params.push(from);
                    const fromParam = `$${params.length}`;
                    params.push(to);
                    const toParam = `$${params.length}`;
                    const sql = `SELECT ${selectColumnsSql(info)} FROM ${historyQualified}
                      WHERE ${preds.join(' AND ')}
                        AND ${quoteIdent(info.recordedAtColumn)} >= ${fromParam}
                        AND ${quoteIdent(info.recordedAtColumn)} <= ${toParam}
                      ${orderClause}`;
                    const rows = await withPgClient(pgSettings, async (pgClient: any) => {
                      const res = await pgClient.query({ text: sql, values: params });
                      return res.rows;
                    });
                    return rows.map((row: any) => mapVersionRow(info, row));
                  });
                }
              }
            } as any,
            `Adding history fields to ${info.sourceTypeName}`
          );
        }
      }
    }
  };
}

export const HistoryPlugin = createHistoryPlugin();
