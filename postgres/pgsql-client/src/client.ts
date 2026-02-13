import { Client, QueryResult } from 'pg';
import { PgConfig } from 'pg-env';
import { AuthOptions, PgTestConnectionOptions, PgTestClientContext } from '@pgpmjs/types';
import { getRoleName } from './roles';
import { generateContextStatements } from './context-utils';

export type PgClientOpts = {
  deferConnect?: boolean;
  trackConnect?: (p: Promise<any>) => void;
} & Partial<PgTestConnectionOptions>;

export class PgClient {
  public config: PgConfig;
  public client: Client;
  protected opts: PgClientOpts;
  protected ctxStmts: string = '';
  protected contextSettings: PgTestClientContext = {};
  protected _ended: boolean = false;
  protected connectPromise: Promise<void> | null = null;

  constructor(config: PgConfig, opts: PgClientOpts = {}) {
    this.opts = opts;
    this.config = config;
    this.client = new Client({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password
    });
    if (!opts.deferConnect) {
      this.connectPromise = this.client.connect();
      if (opts.trackConnect) opts.trackConnect(this.connectPromise);
    }
  }

  protected async ensureConnected(): Promise<void> {
    if (this.connectPromise) {
      try {
        await this.connectPromise;
      } catch {}
    }
  }

  async close(): Promise<void> {
    if (!this._ended) {
      this._ended = true;
      await this.ensureConnected();
      await this.client.end();
    }
  }

  async begin(): Promise<void> {
    await this.client.query('BEGIN;');
  }

  async savepoint(name: string = 'lqlsavepoint'): Promise<void> {
    await this.client.query(`SAVEPOINT "${name}";`);
  }

  async rollback(name: string = 'lqlsavepoint'): Promise<void> {
    await this.client.query(`ROLLBACK TO SAVEPOINT "${name}";`);
  }

  async commit(): Promise<void> {
    await this.client.query('COMMIT;');
  }

  setContext(ctx: Record<string, string | null>): void {
    Object.assign(this.contextSettings, ctx);
    this.ctxStmts = generateContextStatements(this.contextSettings);
  }

  /**
   * Get the current context settings for the session.
   * Returns a copy of the internal context settings object.
   */
  getContext(): Record<string, string | null> {
    return { ...this.contextSettings };
  }

  /**
   * Set authentication context for the current session.
   * Configures role and user ID using cascading defaults from options -> opts.auth -> RoleMapping.
   */
  auth(options: AuthOptions = {}): void {
    const role =
      options.role ?? this.opts.auth?.role ?? getRoleName('authenticated', this.opts);
    const userIdKey =
      options.userIdKey ?? this.opts.auth?.userIdKey ?? 'jwt.claims.user_id';
    const userId =
      options.userId ?? this.opts.auth?.userId ?? null;

    this.setContext({
      role,
      [userIdKey]: userId !== null ? String(userId) : null
    });
  }

  /**
   * Clear all session context variables and reset to default anonymous role.
   */
  clearContext(): void {
    const defaultRole = getRoleName('anonymous', this.opts);
    
    const nulledSettings: Record<string, string | null> = {};
    Object.keys(this.contextSettings).forEach(key => {
      nulledSettings[key] = null;
    });
    
    nulledSettings.role = defaultRole;
    
    this.ctxStmts = generateContextStatements(nulledSettings);
    this.contextSettings = { role: defaultRole };
  }

  async any<T = any>(query: string, values?: any[]): Promise<T[]> {
    const result = await this.query(query, values);
    return result.rows;
  }

  async one<T = any>(query: string, values?: any[]): Promise<T> {
    const rows = await this.any<T>(query, values);
    if (rows.length !== 1) {
      throw new Error('Expected exactly one result');
    }
    return rows[0];
  }

  async oneOrNone<T = any>(query: string, values?: any[]): Promise<T | null> {
    const rows = await this.any<T>(query, values);
    return rows[0] || null;
  }

  async many<T = any>(query: string, values?: any[]): Promise<T[]> {
    const rows = await this.any<T>(query, values);
    if (rows.length === 0) throw new Error('Expected many rows, got none');
    return rows;
  }

  async manyOrNone<T = any>(query: string, values?: any[]): Promise<T[]> {
    return this.any<T>(query, values);
  }

  async none(query: string, values?: any[]): Promise<void> {
    await this.query(query, values);
  }

  async result(query: string, values?: any[]): Promise<QueryResult> {
    return this.query(query, values);
  }

  async ctxQuery(): Promise<void> {
    if (this.ctxStmts) {
      await this.client.query(this.ctxStmts);
    }
  }

  // NOTE: all queries should call ctxQuery() before executing the query

  async query<T = any>(query: string, values?: any[]): Promise<QueryResult<T>> {
    await this.ctxQuery();
    const result = await this.client.query<T>(query, values);
    return result;
  }
}
