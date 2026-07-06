/**
 * Runtime config resolution + the hub-safety guardrail.
 *
 * The harness is designed to run against an ISOLATED rig (a dedicated pgpm
 * docker container on a non-hub port + a dedicated server port). To make it
 * impossible to accidentally point the load generators at the shared
 * constructive-hub, every command that dials Postgres or a server port runs the
 * port through `assertPortAllowed`. The PG port default is 5433 — NEVER 5432.
 */
import fs from 'node:fs';
import path from 'node:path';

import { Argv, asBool } from './args';

export interface PgConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

// Ports the shared constructive-hub binds (PG, public/dashboard/private GraphQL,
// MinIO). Refuse them unless the operator explicitly passes --allow-hub.
export const HUB_PORTS: number[] = [5432, 3000, 3001, 3002, 9000];

export function assertPortAllowed(port: number, allowHub: boolean, what = 'port'): void {
  if (allowHub) return;
  if (HUB_PORTS.includes(port)) {
    throw new Error(
      `refusing to use ${what} ${port}: it is a reserved constructive-hub port ` +
        `(${HUB_PORTS.join(', ')}). This harness targets an isolated rig; ` +
        `pass --allow-hub to override (danger: may disrupt the live hub).`
    );
  }
}

// CLI flags win over env, env wins over defaults. We NEVER default to 5432.
export function pgConfigFromArgv(argv: Argv): PgConfig {
  const num = (v: any, d: number): number => {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : d;
  };
  const cfg: PgConfig = {
    host: argv['pg-host'] || process.env.PGHOST || 'localhost',
    port: num(argv['pg-port'] ?? process.env.PGPORT, 5433),
    user: argv['pg-user'] || process.env.PGUSER || 'postgres',
    password: argv['pg-password'] ?? process.env.PGPASSWORD ?? 'password',
    database: argv['pg-database'] || process.env.PGDATABASE || 'constructive'
  };
  assertPortAllowed(cfg.port, asBool(argv['allow-hub']), 'pg-port');
  return cfg;
}

// Walk up from `startDir` (default cwd) to the first pnpm-workspace.yaml.
export function findRepoRoot(startDir?: string): string {
  let dir = path.resolve(startDir || process.cwd());
  for (;;) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `could not locate repo root: no pnpm-workspace.yaml walking up from ${startDir || process.cwd()}`
  );
}

// Output directory for every artifact (metrics/harness/pg/results/logs/pids).
export function resolveOutDir(argv: Argv): string {
  const dir = path.resolve(argv['out-dir'] || './perf-out');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// The command used to boot a server. Default: run the built cnc CLI via node.
// Override with --server-cmd "node /some/other/entry.js" (whitespace-split).
export function resolveServerCmd(argv: Argv, repoRoot: string): string[] {
  const raw = argv['server-cmd'];
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().split(/\s+/);
  }
  return ['node', path.join(repoRoot, 'packages', 'cli', 'dist', 'index.js')];
}

// Credentials for authenticated load. Email has a seeder default; the password
// is NEVER given a literal default — flag > PERF_PASSWORD env > null. Commands
// needing auth must error with guidance when it resolves to null.
export function resolveCreds(argv: Argv): { email: string; password: string | null } {
  const emailFlag = typeof argv['email'] === 'string' ? argv['email'].trim() : '';
  const email = emailFlag || 'seeder@gmail.com';
  const pwFlag = typeof argv['password'] === 'string' ? argv['password'] : '';
  const pwEnv = process.env.PERF_PASSWORD || '';
  const password = pwFlag || pwEnv || null;
  return { email, password };
}
