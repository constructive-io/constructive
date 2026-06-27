import type { PgTestClient } from 'pgsql-test';
import { QuoteUtils } from '@pgsql/quotes';
import { QueryBuilder } from '@constructive-io/query-builder';
import type { SqlValue } from '@constructive-io/query-builder';

/** Returns a properly quoted `"schema"."name"` identifier. */
export function ident(qualifier: string, name: string): string {
  return QuoteUtils.quoteQualifiedIdentifier(qualifier, name);
}

/**
 * Lightweight client for a single provisioned table.
 *
 * Captures `PgTestClient` + resolved `schema`/`table` at construction time
 * and uses the AST-backed QueryBuilder for all SQL generation.
 *
 * ```ts
 * const buckets = new TableClient(db, bucketsInfo.schema, bucketsInfo.table);
 * const rows = await buckets.findMany();
 * const row = await buckets.insertReturning({ key: 'docs', owner_id: entityId });
 * ```
 */
export class TableClient {
  private client: PgTestClient;
  readonly schema: string;
  readonly table: string;

  constructor(client: PgTestClient, schema: string, table: string) {
    this.client = client;
    this.schema = schema;
    this.table = table;
  }

  private qb(): QueryBuilder {
    return new QueryBuilder().schema(this.schema).table(this.table);
  }

  async insert(data: Record<string, SqlValue>): Promise<void> {
    const { text, values } = this.qb().insert(data).build();
    await this.client.query(text, values);
  }

  async insertReturning<T = Record<string, unknown>>(
    data: Record<string, SqlValue>,
    returning: string[] = ['*']
  ): Promise<T> {
    const { text, values } = this.qb()
      .insert(data)
      .returning(returning)
      .build();
    return this.client.one<T>(text, values);
  }

  async insertMany(rows: Record<string, SqlValue>[]): Promise<void> {
    const { text, values } = this.qb().insert(rows).build();
    await this.client.query(text, values);
  }

  async insertManyReturning<T = Record<string, unknown>>(
    rows: Record<string, SqlValue>[],
    returning: string[] = ['*']
  ): Promise<T[]> {
    const { text, values } = this.qb()
      .insert(rows)
      .returning(returning)
      .build();
    return this.client.any<T>(text, values);
  }

  async upsert(
    data: Record<string, SqlValue>,
    conflictColumns: string[],
    updateColumns?: Record<string, SqlValue>
  ): Promise<void> {
    const builder = this.qb()
      .insert(data)
      .onConflict({
        columns: conflictColumns,
        action: updateColumns ? 'update' : 'nothing',
        updateColumns,
      });
    const { text, values } = builder.build();
    await this.client.query(text, values);
  }

  async upsertReturning<T = Record<string, unknown>>(
    data: Record<string, SqlValue>,
    conflictColumns: string[],
    updateColumns?: Record<string, SqlValue>,
    returning: string[] = ['*']
  ): Promise<T> {
    const builder = this.qb()
      .insert(data)
      .onConflict({
        columns: conflictColumns,
        action: updateColumns ? 'update' : 'nothing',
        updateColumns,
      })
      .returning(returning);
    const { text, values } = builder.build();
    return this.client.one<T>(text, values);
  }

  async findOne<T = Record<string, unknown>>(
    where: Record<string, SqlValue>,
    columns: string[] = ['*']
  ): Promise<T> {
    const builder = this.qb().select(columns);
    for (const [col, val] of Object.entries(where)) {
      if (val === null) {
        builder.where(col, 'IS', null);
      } else {
        builder.where(col, '=', val);
      }
    }
    const { text, values } = builder.build();
    return this.client.one<T>(text, values);
  }

  async findOneOrNone<T = Record<string, unknown>>(
    where: Record<string, SqlValue>,
    columns: string[] = ['*']
  ): Promise<T | null> {
    const builder = this.qb().select(columns);
    for (const [col, val] of Object.entries(where)) {
      if (val === null) {
        builder.where(col, 'IS', null);
      } else {
        builder.where(col, '=', val);
      }
    }
    const { text, values } = builder.build();
    return this.client.oneOrNone<T>(text, values);
  }

  async findMany<T = Record<string, unknown>>(
    opts: {
      where?: Record<string, SqlValue>;
      columns?: string[];
      orderBy?: string;
      orderDir?: 'ASC' | 'DESC';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<T[]> {
    const builder = this.qb().select(opts.columns ?? ['*']);
    if (opts.where) {
      for (const [col, val] of Object.entries(opts.where)) {
        if (val === null) {
          builder.where(col, 'IS', null);
        } else {
          builder.where(col, '=', val);
        }
      }
    }
    if (opts.orderBy) {
      builder.orderBy(opts.orderBy, opts.orderDir ?? 'ASC');
    }
    if (opts.limit !== undefined) {
      builder.limit(opts.limit);
    }
    if (opts.offset !== undefined) {
      builder.offset(opts.offset);
    }
    const { text, values } = builder.build();
    return this.client.any<T>(text, values);
  }

  async count(where?: Record<string, SqlValue>): Promise<number> {
    const builder = new QueryBuilder()
      .schema(this.schema)
      .table(this.table)
      .select(['count(*)']);
    if (where) {
      for (const [col, val] of Object.entries(where)) {
        if (val === null) {
          builder.where(col, 'IS', null);
        } else {
          builder.where(col, '=', val);
        }
      }
    }
    const { text, values } = builder.build();
    const row = await this.client.one<{ count: string }>(text, values);
    return parseInt(row.count, 10);
  }

  async update(
    data: Record<string, SqlValue>,
    where: Record<string, SqlValue>
  ): Promise<number> {
    const builder = this.qb().update(data);
    for (const [col, val] of Object.entries(where)) {
      if (val === null) {
        builder.where(col, 'IS', null);
      } else {
        builder.where(col, '=', val);
      }
    }
    const { text, values } = builder.build();
    const result = await this.client.query(text, values);
    return (result as any).rowCount || 0;
  }

  async updateReturning<T = Record<string, unknown>>(
    data: Record<string, SqlValue>,
    where: Record<string, SqlValue>,
    returning: string[] = ['*']
  ): Promise<T[]> {
    const builder = this.qb().update(data).returning(returning);
    for (const [col, val] of Object.entries(where)) {
      if (val === null) {
        builder.where(col, 'IS', null);
      } else {
        builder.where(col, '=', val);
      }
    }
    const { text, values } = builder.build();
    return this.client.any<T>(text, values);
  }

  async delete(where: Record<string, SqlValue>): Promise<number> {
    const builder = this.qb().delete();
    for (const [col, val] of Object.entries(where)) {
      if (val === null) {
        builder.where(col, 'IS', null);
      } else {
        builder.where(col, '=', val);
      }
    }
    const { text, values } = builder.build();
    const result = await this.client.query(text, values);
    return (result as any).rowCount || 0;
  }

  async deleteReturning<T = Record<string, unknown>>(
    where: Record<string, SqlValue>,
    returning: string[] = ['*']
  ): Promise<T[]> {
    const builder = this.qb().delete().returning(returning);
    for (const [col, val] of Object.entries(where)) {
      if (val === null) {
        builder.where(col, 'IS', null);
      } else {
        builder.where(col, '=', val);
      }
    }
    const { text, values } = builder.build();
    return this.client.any<T>(text, values);
  }

  async callFunction<T = Record<string, unknown>>(
    fnName: string,
    args?: SqlValue[] | Record<string, SqlValue>,
    columns?: string[]
  ): Promise<T> {
    const builder = new QueryBuilder().schema(this.schema);
    if (columns) {
      builder.select(columns);
    }
    builder.call(fnName, args);
    const { text, values } = builder.build();
    return this.client.one<T>(text, values);
  }

  async callFunctionMany<T = Record<string, unknown>>(
    fnName: string,
    args?: SqlValue[] | Record<string, SqlValue>,
    columns?: string[]
  ): Promise<T[]> {
    const builder = new QueryBuilder().schema(this.schema);
    if (columns) {
      builder.select(columns);
    }
    builder.call(fnName, args);
    const { text, values } = builder.build();
    return this.client.any<T>(text, values);
  }
}
