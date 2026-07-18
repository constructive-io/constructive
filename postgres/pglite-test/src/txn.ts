import { PgConfig } from 'pg-env';
import { PgTestClient, PgTestClientOpts } from 'pgsql-test';

/**
 * Coordinates transaction control across the `pg` and `db` clients when they
 * share ONE PGlite session.
 *
 * On a real Postgres server `pg` and `db` are independent connections, each with
 * its own transaction, so the standard harness opens a `BEGIN`+`SAVEPOINT` on
 * both. PGlite is a single in-process session, so a second `BEGIN` is a no-op
 * and a `ROLLBACK TO SAVEPOINT` after the other client's `COMMIT` errors.
 *
 * This coordinator ref-counts the shared depth so exactly one `BEGIN`, one
 * outer `SAVEPOINT`, one `ROLLBACK TO SAVEPOINT` and one `COMMIT` run per test —
 * regardless of whether the caller drives one client or both. It works for the
 * common orderings:
 *   beforeEach: pg.beforeEach(); db.beforeEach();
 *   afterEach:  db.afterEach();  pg.afterEach();
 * and for the single-client pattern (`db` only).
 */
export class SharedTxn {
  private depth = 0;

  /** True only for the outermost `begin()` (the one that should emit BEGIN). */
  beginNeeded(): boolean {
    return this.depth++ === 0;
  }

  /** True only for the outermost `commit()` (the one that should emit COMMIT). */
  commitNeeded(): boolean {
    return --this.depth === 0;
  }

  /** True while exactly one transaction level is open (the outer savepoint scope). */
  atOuter(): boolean {
    return this.depth === 1;
  }
}

/**
 * `PgTestClient` whose transaction control is routed through a `SharedTxn`, so
 * two clients over one PGlite session don't double-`BEGIN` or over-`COMMIT`.
 * Everything else (query, setContext, auth, loadSql, ...) is inherited verbatim.
 */
export class PgliteTestClient extends PgTestClient {
  private txn: SharedTxn;

  constructor(config: PgConfig, opts: PgTestClientOpts, txn: SharedTxn) {
    super(config, opts);
    this.txn = txn;
  }

  async begin(): Promise<void> {
    if (this.txn.beginNeeded()) await super.begin();
  }

  async savepoint(name?: string): Promise<void> {
    if (this.txn.atOuter()) await super.savepoint(name);
  }

  async rollback(name?: string): Promise<void> {
    if (this.txn.atOuter()) await super.rollback(name);
  }

  async commit(): Promise<void> {
    if (this.txn.commitNeeded()) await super.commit();
  }
}
