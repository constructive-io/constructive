import type { PgTestClient } from 'pgsql-test';
import { ident } from './core/identifiers';

/**
 * Generic table client wrapping INSERT/SELECT/UPDATE/DELETE for a dynamically
 * resolved schema.table. Eliminates repeated inline SQL for CRUD operations.
 *
 * The schema + table name come from metaschema resolution at test setup time.
 *
 * @example
 * const storage = await resolveStorageModule(pg, database_id);
 * const buckets = new TableClient(db, storage.buckets.schema_name, 'buckets');
 *
 * const bucket = await buckets.insert({ name: 'test-bucket', bucket_key: 'photos' });
 * const found = await buckets.findOne({ id: bucket.id });
 * await buckets.update({ id: bucket.id }, { name: 'renamed' });
 * await buckets.delete({ id: bucket.id });
 */
export class TableClient<T extends Record<string, unknown> = Record<string, unknown>> {
  private readonly qualifiedName: string;

  constructor(
    private readonly client: PgTestClient,
    public readonly schema: string,
    public readonly table: string
  ) {
    this.qualifiedName = ident(schema, table);
  }

  /**
   * INSERT a row. Returns the inserted row (RETURNING *).
   */
  async insert(data: Partial<T>): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const cols = keys.map((k) => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const result = await this.client.one<T>(
      `INSERT INTO ${this.qualifiedName} (${cols})
       VALUES (${placeholders})
       RETURNING *`,
      values
    );
    return result;
  }

  /**
   * SELECT a single row matching the given where clause.
   * Throws if not found.
   */
  async findOne(where: Partial<T>): Promise<T> {
    const { clause, values } = this.buildWhere(where);
    return this.client.one<T>(
      `SELECT * FROM ${this.qualifiedName} WHERE ${clause}`,
      values
    );
  }

  /**
   * SELECT a single row matching the given where clause.
   * Returns null if not found.
   */
  async findOneOrNull(where: Partial<T>): Promise<T | null> {
    const { clause, values } = this.buildWhere(where);
    return this.client.oneOrNone<T>(
      `SELECT * FROM ${this.qualifiedName} WHERE ${clause}`,
      values
    );
  }

  /**
   * SELECT all rows matching the given where clause.
   */
  async findMany(where?: Partial<T>, orderBy?: string): Promise<T[]> {
    if (!where || Object.keys(where).length === 0) {
      const order = orderBy ? ` ORDER BY ${orderBy}` : '';
      return this.client.any<T>(`SELECT * FROM ${this.qualifiedName}${order}`);
    }
    const { clause, values } = this.buildWhere(where);
    const order = orderBy ? ` ORDER BY ${orderBy}` : '';
    return this.client.any<T>(
      `SELECT * FROM ${this.qualifiedName} WHERE ${clause}${order}`,
      values
    );
  }

  /**
   * COUNT rows matching the given where clause.
   */
  async count(where?: Partial<T>): Promise<number> {
    if (!where || Object.keys(where).length === 0) {
      const row = await this.client.one<{ count: string }>(
        `SELECT count(*)::text AS count FROM ${this.qualifiedName}`
      );
      return Number(row.count);
    }
    const { clause, values } = this.buildWhere(where);
    const row = await this.client.one<{ count: string }>(
      `SELECT count(*)::text AS count FROM ${this.qualifiedName} WHERE ${clause}`,
      values
    );
    return Number(row.count);
  }

  /**
   * UPDATE rows matching the where clause. Returns updated rows.
   */
  async update(where: Partial<T>, data: Partial<T>): Promise<T[]> {
    const setKeys = Object.keys(data);
    const setValues = Object.values(data);
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);

    let idx = 1;
    const setClauses = setKeys.map((k) => `"${k}" = $${idx++}`);
    const whereClauses = whereKeys.map((k) => `"${k}" = $${idx++}`);

    return this.client.any<T>(
      `UPDATE ${this.qualifiedName}
       SET ${setClauses.join(', ')}
       WHERE ${whereClauses.join(' AND ')}
       RETURNING *`,
      [...setValues, ...whereValues]
    );
  }

  /**
   * DELETE rows matching the where clause. Returns deleted rows.
   */
  async delete(where: Partial<T>): Promise<T[]> {
    const { clause, values } = this.buildWhere(where);
    return this.client.any<T>(
      `DELETE FROM ${this.qualifiedName} WHERE ${clause} RETURNING *`,
      values
    );
  }

  /**
   * Execute a raw query within this table's schema context.
   */
  async raw<R = T>(sql: string, params?: unknown[]): Promise<R[]> {
    return this.client.any<R>(sql, params);
  }

  private buildWhere(where: Partial<T>): { clause: string; values: unknown[] } {
    const keys = Object.keys(where);
    const values = Object.values(where);
    const clause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ');
    return { clause, values };
  }
}
