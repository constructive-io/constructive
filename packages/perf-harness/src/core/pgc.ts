/**
 * Postgres client helpers + error classification.
 *
 * `pg` is a real dependency of this package now, so `getPg()` is a plain
 * require — NOT the @dataplan/pg resolution chain the standalone scripts used.
 * The classification helpers are ported from
 * `scripts/scale-validate/tenant-factory.mjs`.
 */
import { PgConfig } from './config';

export function getPg(): { Client: any; Pool: any } {
  // Lazy require so importing this module never loads pg until a caller needs a
  // real connection (keeps pure/unit paths free of the native binding).
  return require('pg');
}

export async function withFreshClient<T>(pg: PgConfig, fn: (client: any) => Promise<T>): Promise<T> {
  const { Client } = getPg();
  const client = new Client(pg);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    try {
      await client.end();
    } catch {
      // a broken connection's end() can reject — never mask the real error
    }
  }
}

// 57P0x/08006/08003/53300 + a message sniff: connection-class failures (e.g. PG
// crash recovery / server restart). Callers retry these after a long backoff so
// a run survives a server restart.
export function isConnLoss(err: any): boolean {
  const code = err && err.code;
  if (['57P01', '57P02', '57P03', '08006', '08003', '53300'].includes(code)) return true;
  const msg = (err && err.message) || '';
  return /connection terminated|terminating connection|server closed the connection/i.test(msg);
}

// 40P01/40001: deadlock / serialization failure — retry the transaction.
export function isRetryableTxn(err: any): boolean {
  const code = err && err.code;
  return code === '40P01' || code === '40001';
}
