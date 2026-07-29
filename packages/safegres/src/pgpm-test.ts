/**
 * Test helper for pgpm projects: deploy the workspace into an ephemeral
 * database (via pgsql-test) and audit it with the project's discovered
 * safegres config.
 *
 * `pgsql-test` is an optional peer dependency — only needed when this
 * entrypoint is imported.
 *
 * ```ts
 * import { auditPgpmWorkspace } from 'safegres/pgpm-test';
 *
 * it('passes the security audit', async () => {
 *   const report = await auditPgpmWorkspace();
 *   expect(report.score.grade).toBe('A+');
 * });
 * ```
 */
import { getConnections, seed } from 'pgsql-test';

import { audit, type AuditOptions } from './commands/audit';
import { loadConfig } from './config/loader';
import type { SafegresConfig } from './config/types';
import type { QueryExecutor } from './pg/introspect';
import type { Report } from './types';

export interface AuditPgpmWorkspaceOptions extends Omit<AuditOptions, 'config'> {
  /**
   * pgpm workspace or module directory to deploy. Defaults to the nearest
   * pgpm module/workspace discovered from `process.cwd()`.
   */
  cwd?: string;
  /** Explicit safegres config file (else discovered by walk-up from `cwd`). */
  configFile?: string;
  /** Built-in preset name (recommended|strict|constructive|minimal). */
  preset?: string;
  /** Pre-resolved config — skips discovery entirely. */
  config?: SafegresConfig;
}

/**
 * Deploy the pgpm workspace at `cwd` into an ephemeral test database, run
 * `safegres audit` against it with the project's safegres config, tear the
 * database down, and return the report.
 */
export async function auditPgpmWorkspace(
  options: AuditPgpmWorkspaceOptions = {}
): Promise<Report> {
  const { cwd, configFile, preset, config: explicitConfig, ...auditOptions } = options;
  const config = explicitConfig ?? loadConfig({ cwd, configFile, preset }).config;
  const { pg, teardown } = await getConnections({}, [seed.pgpm(cwd)]);
  try {
    return await audit(pg.client as unknown as QueryExecutor, {
      ...auditOptions,
      config
    });
  } finally {
    await teardown();
  }
}
