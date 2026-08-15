/**
 * Prisma-like table client over @constructive-io/query-builder.
 *
 * This is the RUNTIME code that gets copied to generated output. Generated
 * per-schema `db` factories bind one TableClient per table, wiring the
 * generated column metadata and field decoders in so call sites only see
 * camelCase fields, `where` filters in the shared query-spec grammar, and
 * decoded application values.
 *
 * NOTE: This file is read at codegen time and written to output.
 * Any changes here will affect all generated clients.
 */
import type { Expr, Filter, Operand, SqlValue } from '@constructive-io/query-builder';
import { fn, lit, QueryBuilder } from '@constructive-io/query-builder';

/** Anything with pg's `query(text, values)` shape: Pool, PoolClient, Client. */
export interface Queryable {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[]; rowCount?: number | null }>;
}

/** One generated decoder per field, as emitted in the `<table>Fields` constant. */
export type FieldDecoders<App> = {
  [K in keyof App]: (value: unknown, label?: string) => App[K];
};

/** Table wiring supplied by the generated per-schema `db` factory. */
export interface TableSpec<App> {
  schema: string;
  table: string;
  columnByField: Record<string, string>;
  fields: FieldDecoders<App>;
  /** camelCase fields backed by json/jsonb columns, serialized on writes. */
  jsonFields?: readonly string[];
}

/**
 * Select shape — same as the GraphQL ORM, stated either way round:
 *
 * - `{ id: true, name: true }` reads those fields and nothing else;
 * - `{ databaseId: false }` reads every field except that one, for the field a
 *   record has in general but this binding's table does not (a scope's copy of
 *   a table without the scope key column) or that a caller must not carry (a
 *   secret's id, row bookkeeping).
 *
 * Naming a field `true` is a projection and wins outright: the excluded ones
 * are simply not in it.
 */
export type SelectShape<App> = { [K in keyof App]?: boolean };

type TrueKeys<App, S> = {
  [K in keyof S]-?: S[K] extends true ? K & keyof App : never;
}[keyof S];

type FalseKeys<App, S> = {
  [K in keyof S]-?: S[K] extends false ? K & keyof App : never;
}[keyof S];

/**
 * Rows narrow to what the select states: the picked fields, else the record
 * minus the excluded ones. No `select` returns the full record.
 */
export type SelectResult<App, S extends SelectShape<App> | undefined> =
  S extends SelectShape<App>
    ? [TrueKeys<App, S>] extends [never]
      ? [FalseKeys<App, S>] extends [never]
        ? App
        : Omit<App, FalseKeys<App, S>>
      : Pick<App, TrueKeys<App, S>>
    : App;

/** Per-field operators from the shared query-spec grammar. */
export interface FieldOps<V> {
  equalTo?: V;
  notEqualTo?: V;
  distinctFrom?: V;
  notDistinctFrom?: V;
  lessThan?: V;
  lessThanOrEqualTo?: V;
  greaterThan?: V;
  greaterThanOrEqualTo?: V;
  in?: V[];
  notIn?: V[];
  like?: string;
  notLike?: string;
  likeInsensitive?: string;
  notLikeInsensitive?: string;
  includes?: string;
  notIncludes?: string;
  includesInsensitive?: string;
  startsWith?: string;
  endsWith?: string;
  isNull?: boolean;
}

const FIELD_OP_NAMES: ReadonlySet<string> = new Set([
  'equalTo',
  'notEqualTo',
  'distinctFrom',
  'notDistinctFrom',
  'lessThan',
  'lessThanOrEqualTo',
  'greaterThan',
  'greaterThanOrEqualTo',
  'in',
  'notIn',
  'like',
  'notLike',
  'likeInsensitive',
  'notLikeInsensitive',
  'includes',
  'notIncludes',
  'includesInsensitive',
  'startsWith',
  'endsWith',
  'isNull'
]);

/**
 * Where filter keyed by camelCase field names. A bare value means `equalTo`
 * (`null` means `isNull`). Extra string keys are physical column names —
 * runtime-configured scope key columns qualify rows the same way any other
 * condition does.
 */
export type Where<App> = {
  [K in keyof App]?: App[K] | FieldOps<NonNullable<App[K]>>;
} & {
  [column: string]: unknown;
} & {
  and?: Where<App>[];
  or?: Where<App>[];
  not?: Where<App>;
};

/**
 * Write data keyed by camelCase field names. Extra string keys are physical
 * column names — runtime-configured scope key columns are stamped the same
 * way any other value is.
 *
 * A value may also be a query-builder expression, so a write that reads the
 * column it sets stays one statement:
 *
 * ```ts
 * data: { lastError: message, errorCount: add(col('error_count'), 1) }
 * ```
 */
export type Data<App> = { [K in keyof App]?: App[K] | Expr } & {
  [column: string]: unknown;
};

export type OrderDirection = 'ASC' | 'DESC';

/** Order spec keyed by camelCase field names, e.g. `{ createdAt: 'DESC' }`. */
export type OrderBy<App> = { [K in keyof App]?: OrderDirection };

export interface FindManyArgs<App, S extends SelectShape<App> | undefined> {
  where?: Where<App>;
  select?: S;
  orderBy?: OrderBy<App> | OrderBy<App>[];
  limit?: number;
  offset?: number;
}

export interface FindFirstArgs<App, S extends SelectShape<App> | undefined> {
  where?: Where<App>;
  select?: S;
  orderBy?: OrderBy<App> | OrderBy<App>[];
}

export interface CreateArgs<App, S extends SelectShape<App> | undefined> {
  data: Data<App>;
  select?: S;
}

/**
 * An upsert states the unique columns it conflicts on, the row to insert, and
 * what to set when one already exists. No `update` means an existing row is
 * left as it is (`ON CONFLICT DO NOTHING`), and then there may be no row to
 * return.
 *
 * ```ts
 * await db.appConfigs.upsert({
 *   conflict: ['namespaceId', 'name'],
 *   create: { name, value, namespaceId },
 *   update: { value, updatedAt: fn('now') }
 * });
 * ```
 */
export interface UpsertArgs<App, S extends SelectShape<App> | undefined> {
  /** The unique fields to conflict on, named as generated fields. */
  conflict: readonly (keyof App & string)[];
  create: Data<App>;
  update?: Data<App>;
  select?: S;
}

export interface UpdateArgs<App, S extends SelectShape<App> | undefined> {
  where: Where<App>;
  data: Data<App>;
  select?: S;
}

export interface DeleteArgs<App, S extends SelectShape<App> | undefined> {
  where: Where<App>;
  select?: S;
}

/** Thrown by `findFirstOrThrow` / `updateOrThrow` when no row matches. */
export class RowNotFoundError extends Error {
  constructor(
    public readonly table: string,
    public readonly operation: string
  ) {
    super(`${table}.${operation}: no row matched the given where filter`);
    this.name = 'RowNotFoundError';
  }
}

const encodeScalar = (value: unknown): SqlValue => {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && !Array.isArray(value)) return JSON.stringify(value);
  return value as SqlValue;
};

export class TableClient<App> {
  constructor(
    private readonly spec: TableSpec<App>,
    private readonly db: Queryable
  ) {}

  async findMany<S extends SelectShape<App> | undefined = undefined>(
    args: FindManyArgs<App, S> = {}
  ): Promise<SelectResult<App, S>[]> {
    const fields = this.selectedFields(args.select);
    const query = this.baseQuery().select(fields.map(field => this.column(field)));
    const predicate = this.predicate(args.where);
    if (predicate) query.where(predicate);
    this.applyOrderBy(query, args.orderBy);
    if (args.limit !== undefined) query.limit(args.limit);
    if (args.offset !== undefined) query.offset(args.offset);
    const { text, values } = query.build();
    const { rows } = await this.db.query(text, values);
    return rows.map(row => this.decodeRow(row, fields));
  }

  async findFirst<S extends SelectShape<App> | undefined = undefined>(
    args: FindFirstArgs<App, S> = {}
  ): Promise<SelectResult<App, S> | null> {
    const rows = await this.findMany({ ...args, limit: 1 });
    return rows.length > 0 ? rows[0] : null;
  }

  async findFirstOrThrow<S extends SelectShape<App> | undefined = undefined>(
    args: FindFirstArgs<App, S> = {}
  ): Promise<SelectResult<App, S>> {
    const row = await this.findFirst(args);
    if (row === null) throw new RowNotFoundError(this.spec.table, 'findFirstOrThrow');
    return row;
  }

  async count(where?: Where<App>): Promise<number> {
    const query = this.baseQuery().select([]).selectExpr('count', fn('count', [lit(1)]));
    const predicate = this.predicate(where);
    if (predicate) query.where(predicate);
    const { text, values } = query.build();
    const { rows } = await this.db.query(text, values);
    const row = rows[0] as { count: string | number };
    return Number(row.count);
  }

  async create<S extends SelectShape<App> | undefined = undefined>(
    args: CreateArgs<App, S>
  ): Promise<SelectResult<App, S>> {
    const fields = this.selectedFields(args.select);
    const query = this.baseQuery()
      .insert(this.encodeData(args.data))
      .returning(fields.map(field => this.column(field)));
    const { text, values } = query.build();
    const { rows } = await this.db.query(text, values);
    return this.decodeRow(rows[0], fields);
  }

  /**
   * Insert a row, or reconcile the one the conflict target already matches.
   * Returns the resulting row, or null when a conflicting row was left as it
   * is by an upsert that states no `update`.
   */
  async upsert<S extends SelectShape<App> | undefined = undefined>(
    args: UpsertArgs<App, S>
  ): Promise<SelectResult<App, S> | null> {
    if (args.conflict.length === 0) {
      throw new Error(
        `${this.spec.table}.upsert: refusing an empty conflict target, which names no unique constraint`
      );
    }
    const fields = this.selectedFields(args.select);
    const columns = args.conflict.map(field => this.column(field));
    const updateColumns = args.update ? this.encodeData(args.update) : {};
    const query = this.baseQuery()
      .insert(this.encodeData(args.create))
      .onConflict(
        Object.keys(updateColumns).length > 0
          ? { columns, action: 'update', updateColumns }
          : { columns, action: 'nothing' }
      )
      .returning(fields.map(field => this.column(field)));
    const { text, values } = query.build();
    const { rows } = await this.db.query(text, values);
    return rows.length > 0 ? this.decodeRow(rows[0], fields) : null;
  }

  async update<S extends SelectShape<App> | undefined = undefined>(
    args: UpdateArgs<App, S>
  ): Promise<SelectResult<App, S>[]> {
    const fields = this.selectedFields(args.select);
    const query = this.baseQuery()
      .update(this.encodeData(args.data))
      .where(this.required(args.where, 'update'))
      .returning(fields.map(field => this.column(field)));
    const { text, values } = query.build();
    const { rows } = await this.db.query(text, values);
    return rows.map(row => this.decodeRow(row, fields));
  }

  async updateOrThrow<S extends SelectShape<App> | undefined = undefined>(
    args: UpdateArgs<App, S>
  ): Promise<SelectResult<App, S>> {
    const rows = await this.update(args);
    if (rows.length === 0) throw new RowNotFoundError(this.spec.table, 'updateOrThrow');
    return rows[0];
  }

  async delete<S extends SelectShape<App> | undefined = undefined>(
    args: DeleteArgs<App, S>
  ): Promise<SelectResult<App, S>[]> {
    const fields = this.selectedFields(args.select);
    const query = this.baseQuery()
      .delete()
      .where(this.required(args.where, 'delete'))
      .returning(fields.map(field => this.column(field)));
    const { text, values } = query.build();
    const { rows } = await this.db.query(text, values);
    return rows.map(row => this.decodeRow(row, fields));
  }

  /** Rebind to another connection (e.g. a transaction's PoolClient). */
  $with(db: Queryable): TableClient<App> {
    return new TableClient(this.spec, db);
  }

  private baseQuery(): QueryBuilder {
    return new QueryBuilder().schema(this.spec.schema).table(this.spec.table);
  }

  private column(field: string): string {
    return this.spec.columnByField[field] ?? field;
  }

  private selectedFields(select: SelectShape<App> | undefined): (keyof App & string)[] {
    const all = Object.keys(this.spec.columnByField) as (keyof App & string)[];
    if (!select) return all;
    const picked = all.filter(field => select[field] === true);
    if (picked.length > 0) return picked;
    // Nothing picked: the select either excludes fields or says nothing at all,
    // and both read what is left.
    return all.filter(field => select[field] !== false);
  }

  private decodeRow<S extends SelectShape<App> | undefined>(
    row: unknown,
    fields: (keyof App & string)[]
  ): SelectResult<App, S> {
    const raw = row as Record<string, unknown>;
    const decoded: Record<string, unknown> = {};
    for (const field of fields) {
      decoded[field] = this.spec.fields[field](raw[this.column(field)]);
    }
    return decoded as SelectResult<App, S>;
  }

  /**
   * The predicate to apply, or nothing to apply: a caller that spreads a
   * conditional key column (a scope that records none) states an empty filter,
   * and an unqualified read is what it asked for.
   */
  private predicate(where: Where<App> | undefined): Filter | undefined {
    if (!where) return undefined;
    const filter = this.filter(where);
    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  /** A write says which rows: an empty filter would mean the whole table. */
  private required(where: Where<App>, operation: string): Filter {
    const predicate = this.predicate(where);
    if (!predicate) {
      throw new Error(
        `${this.spec.table}.${operation}: refusing an empty where filter, which would match every row`
      );
    }
    return predicate;
  }

  private filter(where: Where<App>): Filter {
    const filter: Filter = {};
    for (const [key, value] of Object.entries(where)) {
      if (value === undefined) continue;
      if (key === 'and' || key === 'or') {
        filter[key] = (value as Where<App>[]).map(nested => this.filter(nested));
        continue;
      }
      if (key === 'not') {
        filter.not = this.filter(value as Where<App>);
        continue;
      }
      filter[this.column(key)] = this.fieldFilter(value);
    }
    return filter;
  }

  private fieldFilter(value: unknown): Filter[string] {
    if (value === null) return { isNull: true };
    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length > 0 && entries.every(([op]) => FIELD_OP_NAMES.has(op))) {
        const ops: Record<string, unknown> = {};
        for (const [op, operand] of entries) {
          if (operand === undefined) continue;
          ops[op] = Array.isArray(operand)
            ? operand.map(encodeScalar)
            : op === 'isNull'
              ? operand
              : encodeScalar(operand);
        }
        return ops as Filter[string];
      }
    }
    return { equalTo: encodeScalar(value) };
  }

  private applyOrderBy(query: QueryBuilder, orderBy: OrderBy<App> | OrderBy<App>[] | undefined): void {
    if (!orderBy) return;
    for (const spec of Array.isArray(orderBy) ? orderBy : [orderBy]) {
      for (const [field, direction] of Object.entries(spec)) {
        if (!direction) continue;
        query.orderBy(this.column(field), direction as OrderDirection);
      }
    }
  }

  private encodeData(data: Data<App>): Record<string, Operand> {
    const encoded: Record<string, Operand> = {};
    for (const [field, value] of Object.entries(data)) {
      if (value === undefined) continue;
      // An expression is SQL the caller wrote: it is deparsed in place, never
      // bound as a value, and never serialized as one either.
      if (typeof value === 'function') {
        encoded[this.column(field)] = value as Expr;
        continue;
      }
      if (value !== null && this.spec.jsonFields?.includes(field)) {
        encoded[this.column(field)] = JSON.stringify(value);
        continue;
      }
      // pg serializes JS arrays into PostgreSQL array literals.
      encoded[this.column(field)] = Array.isArray(value)
        ? (value.map(encodeScalar) as unknown as SqlValue)
        : encodeScalar(value);
    }
    return encoded;
  }
}
