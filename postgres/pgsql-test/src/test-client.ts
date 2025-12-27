import { PgConfig } from 'pg-env';
import { PgClient, PgClientOpts } from 'pgsql-client';
import { insertJsonMap, type JsonSeedMap } from 'pgsql-seed';
import { loadCsvMap, type CsvSeedMap } from 'pgsql-seed';
import { loadSqlFiles } from 'pgsql-seed';
import { deployPgpm } from 'pgsql-seed';

export type PgTestClientOpts = PgClientOpts;

export class PgTestClient extends PgClient {
  constructor(config: PgConfig, opts: PgTestClientOpts = {}) {
    super(config, opts);
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
