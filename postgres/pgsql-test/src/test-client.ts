import { DeferredConstraintsMode } from '@pgpmjs/types';
import { QueryResult } from 'pg';
import { PgConfig } from 'pg-env';
import { PgClient, PgClientOpts } from 'pgsql-client';
import { insertJsonMap, type JsonSeedMap } from 'pgsql-seed';
import { type CsvSeedMap,loadCsvMap } from 'pgsql-seed';
import { loadSqlFiles } from 'pgsql-seed';
import { deployPgpm } from 'pgsql-seed';

import { formatPgError } from './utils';

export type PgTestClientOpts = PgClientOpts & {
  /**
   * Enable enhanced PostgreSQL error messages with extended fields.
   * Defaults to true. Errors will include detail, hint, where, position, etc.
   * Can be disabled by setting enhancedErrors: false.
   */
  enhancedErrors?: boolean;
  /**
   * How DEFERRABLE INITIALLY DEFERRED constraints are handled under rollback isolation.
   * Defaults to 'off'. See {@link DeferredConstraintsMode}.
   */
  deferredConstraints?: DeferredConstraintsMode;
};

const IN_FAILED_SQL_TRANSACTION = '25P02';

export class PgTestClient extends PgClient {
  protected testOpts: PgTestClientOpts;

  constructor(config: PgConfig, opts: PgTestClientOpts = {}) {
    super(config, opts);
    this.testOpts = opts;
  }

  /**
   * Check if enhanced errors are enabled. Defaults to true.
   * Can be disabled by setting enhancedErrors: false in options.
   */
  private shouldEnhanceErrors(): boolean {
    // Default to true unless explicitly disabled via option
    return this.testOpts.enhancedErrors !== false;
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

  private get deferredConstraintsMode(): DeferredConstraintsMode {
    return this.testOpts.deferredConstraints ?? 'off';
  }

  async beforeEach(): Promise<void> {
    await this.begin();
    await this.savepoint();
    if (this.deferredConstraintsMode === 'immediate') {
      await this.setConstraintsImmediate();
    }
  }

  async afterEach(): Promise<void> {
    let violation: unknown;
    if (this.deferredConstraintsMode === 'check') {
      try {
        await this.checkConstraints();
      } catch (err: any) {
        if (err?.code !== IN_FAILED_SQL_TRANSACTION) violation = err;
      }
    }
    await this.rollback();
    await this.commit();
    if (violation) throw violation;
  }

  /**
   * Run the commit-time checks for every pending deferred constraint now, without committing.
   * Postgres checks all outstanding deferred constraint events when a constraint switches from
   * DEFERRED to IMMEDIATE, so this fails exactly where a real COMMIT would have failed.
   * Once it passes (or throws), the pending events are consumed.
   */
  async checkConstraints(): Promise<void> {
    try {
      await this.setConstraintsImmediate();
    } catch (err: any) {
      if (err?.code !== IN_FAILED_SQL_TRANSACTION) {
        err.message = `[pgsql-test] deferred constraint violated at end of test (a real COMMIT would have failed here):\n${err.message}`;
      }
      throw err;
    }
  }

  private async setConstraintsImmediate(): Promise<void> {
    await this.query('SET CONSTRAINTS ALL IMMEDIATE');
  }

  /**
   * Commit current transaction to make data visible to other connections, then start fresh transaction.
   * Maintains test isolation by creating a savepoint and reapplying session context.
   */
  async publish(): Promise<void> {
    await this.commit();    // make data visible to other sessions
    await this.begin();     // fresh tx
    await this.savepoint(); // keep rollback harness
    if (this.deferredConstraintsMode === 'immediate') {
      await this.setConstraintsImmediate();
    }
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
    await deployPgpm(this.config, cwd, cache, { workspace: Boolean(cwd) });
  }

}
