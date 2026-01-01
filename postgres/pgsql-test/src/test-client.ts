import { PgConfig } from 'pg-env';
import { PgClient, PgClientOpts } from 'pgsql-client';
import { insertJsonMap, type JsonSeedMap } from 'pgsql-seed';
import { loadCsvMap, type CsvSeedMap } from 'pgsql-seed';
import { loadSqlFiles } from 'pgsql-seed';
import { deployPgpm } from 'pgsql-seed';
import { QueryResult } from 'pg';
import { formatPgError } from './utils';

export type PgTestClientOpts = PgClientOpts & {
  /**
   * Enable enhanced PostgreSQL error messages with extended fields.
   * When true, errors will include detail, hint, where, position, etc.
   * Can also be enabled via PGSQL_TEST_ENHANCED_ERRORS=1 environment variable.
   */
  enhancedErrors?: boolean;
};

export class PgTestClient extends PgClient {
  protected testOpts: PgTestClientOpts;

  constructor(config: PgConfig, opts: PgTestClientOpts = {}) {
    super(config, opts);
    this.testOpts = opts;
  }

  /**
   * Check if enhanced errors are enabled via option or environment variable.
   */
  private shouldEnhanceErrors(): boolean {
    return this.testOpts.enhancedErrors === true || 
           process.env.PGSQL_TEST_ENHANCED_ERRORS === '1' ||
           process.env.PGSQL_TEST_ENHANCED_ERRORS === 'true';
  }

  /**
   * Override query to enhance PostgreSQL errors with extended fields.
   * When enhancedErrors is enabled, errors will include detail, hint, where, position, etc.
   */
  async query<T = any>(query: string, values?: any[]): Promise<QueryResult<T>> {
    try {
      return await super.query<T>(query, values);
    } catch (err: any) {
      if (this.shouldEnhanceErrors()) {
        // Enhance the error message with PostgreSQL extended fields
        err.message = formatPgError(err, { query, values });
      }
      throw err;
    }
  }

  async beforeEach(): Promise<void> {
    await this.begin();
    await this.savepoint();
  }

  async afterEach(): Promise<void> {
    await this.rollback();
    await this.commit();
  }

  /**
   * Commit current transaction to make data visible to other connections, then start fresh transaction.
   * Maintains test isolation by creating a savepoint and reapplying session context.
   */
  async publish(): Promise<void> {
    await this.commit();    // make data visible to other sessions
    await this.begin();     // fresh tx
    await this.savepoint(); // keep rollback harness
    await this.ctxQuery();  // reapply all setContext()
  }

  async loadJson(data: JsonSeedMap): Promise<void> {
    await this.ctxQuery();
    await insertJsonMap(this.client, data);
  }

  async loadSql(files: string[]): Promise<void> {
    await this.ctxQuery();
    await loadSqlFiles(this.client, files);
  }

  // NON-RLS load/seed methods:

  async loadCsv(tables: CsvSeedMap): Promise<void> {
    // await this.ctxQuery(); // no point to call ctxQuery() here
    // because POSTGRES doesn't support row-level security on COPY FROM...
    await loadCsvMap(this.client, tables);
  }

  async loadPgpm(cwd?: string, cache: boolean = false): Promise<void> {
    // await this.ctxQuery(); // no point to call ctxQuery() here
    // because deployPgpm() has it's own way of getting the client...
    // so for now, we'll expose this but it's limited
    await deployPgpm(this.config, cwd, cache);
  }

}
