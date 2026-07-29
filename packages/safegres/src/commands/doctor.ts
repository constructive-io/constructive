/**
 * `safegres doctor` — diagnose the environment before/alongside an audit:
 * connection health, catalog visibility, audit blind spots, parser
 * availability, and configuration problems.
 */

import { parsePolicyExpression } from '../ast/parse';
import { loadConfig, type LoadConfigParams } from '../config/loader';
import { resolveRules } from '../config/resolve';
import type { ExposureConfig } from '../config/types';
import { resolveExposure } from '../pg/exposure';
import { asExecutor, type QueryExecutor } from '../pg/introspect';

export type DoctorStatus = 'ok' | 'warn' | 'fail';

export interface DoctorCheck {
  name: string;
  status: DoctorStatus;
  detail: string;
}

export interface DoctorReport {
  checks: DoctorCheck[];
  ok: boolean;
}

export type DoctorOptions = LoadConfigParams;

export async function doctor(
  client: QueryExecutor | null,
  options: DoctorOptions = {}
): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];
  let exposureConfig: ExposureConfig | undefined;

  // --- configuration ---
  try {
    const loaded = loadConfig(options);
    exposureConfig = loaded.config.exposure;
    if (loaded.isEmpty) {
      checks.push({
        name: 'config',
        status: 'ok',
        detail: 'no config file found — using built-in defaults (safegres:recommended behavior)'
      });
    } else {
      checks.push({ name: 'config', status: 'ok', detail: `loaded ${loaded.filepath}` });
    }
    try {
      const resolved = resolveRules(loaded.config);
      const disabled = [...resolved.rules.entries()].filter(([, r]) => !r.enabled).map(([c]) => c);
      checks.push({
        name: 'rules',
        status: 'ok',
        detail:
          disabled.length > 0
            ? `${resolved.rules.size - disabled.length} enabled, ${disabled.length} disabled (${disabled.join(', ')})`
            : `all ${resolved.rules.size} rules enabled`
      });
    } catch (err) {
      checks.push({ name: 'rules', status: 'fail', detail: (err as Error).message });
    }
  } catch (err) {
    checks.push({ name: 'config', status: 'fail', detail: (err as Error).message });
  }

  // --- SQL parser ---
  try {
    await parsePolicyExpression('true');
    checks.push({ name: 'parser', status: 'ok', detail: 'pgsql-parser is available (AST rules can run)' });
  } catch (err) {
    checks.push({
      name: 'parser',
      status: 'warn',
      detail: `pgsql-parser unavailable — AST rules (A7, P1, P1b, P5) will be skipped: ${(err as Error).message}`
    });
  }

  // --- database ---
  if (!client) {
    checks.push({
      name: 'connection',
      status: 'fail',
      detail: 'could not connect — check PG* env vars or --connection'
    });
    return finish(checks);
  }

  const exec = asExecutor(client);

  try {
    const { rows } = await exec.query<{ version: string; usr: string; db: string }>(
      'SELECT version() AS version, current_user AS usr, current_database() AS db'
    );
    checks.push({
      name: 'connection',
      status: 'ok',
      detail: `${rows[0].db} as ${rows[0].usr} — ${rows[0].version.split(' on ')[0]}`
    });
  } catch (err) {
    checks.push({ name: 'connection', status: 'fail', detail: (err as Error).message });
    return finish(checks);
  }

  try {
    const { rows } = await exec.query<{ n: string }>('SELECT count(*)::text AS n FROM pg_policy');
    checks.push({ name: 'catalog', status: 'ok', detail: `pg_policy readable (${rows[0].n} policies)` });
  } catch (err) {
    checks.push({
      name: 'catalog',
      status: 'fail',
      detail: `cannot read pg_policy — the audit needs catalog access: ${(err as Error).message}`
    });
  }

  try {
    const { rows } = await exec.query<{ super: boolean; bypass: boolean }>(
      'SELECT rolsuper AS super, rolbypassrls AS bypass FROM pg_roles WHERE rolname = current_user'
    );
    const { super: isSuper, bypass } = rows[0] ?? { super: false, bypass: false };
    if (isSuper || bypass) {
      checks.push({
        name: 'privileges',
        status: 'ok',
        detail: `current role ${isSuper ? 'is superuser' : 'has BYPASSRLS'} — full catalog visibility`
      });
    } else {
      checks.push({
        name: 'privileges',
        status: 'warn',
        detail:
          'current role is not superuser and lacks BYPASSRLS — policies/grants on tables it cannot see will be missing from the audit'
      });
    }
  } catch (err) {
    checks.push({ name: 'privileges', status: 'warn', detail: (err as Error).message });
  }

  try {
    const { rows } = await exec.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE c.relkind IN ('r','p') AND c.relrowsecurity
         AND n.nspname NOT IN ('pg_catalog','information_schema')`
    );
    const n = Number(rows[0].n);
    checks.push({
      name: 'rls',
      status: n > 0 ? 'ok' : 'warn',
      detail:
        n > 0
          ? `${n} table(s) have RLS enabled`
          : 'no tables with RLS enabled — nothing for coverage/anti-pattern rules to audit'
    });
  } catch (err) {
    checks.push({ name: 'rls', status: 'warn', detail: (err as Error).message });
  }

  // --- exposure surface ---
  try {
    const exposure = await resolveExposure(exec, exposureConfig);
    if (exposure.known) {
      checks.push({
        name: 'exposure',
        status: 'ok',
        detail: `${exposure.schemas.length} exposed schema(s) via ${exposure.source}${
          exposure.roles && exposure.roles.length > 0 ? ` (api roles: ${exposure.roles.join(', ')})` : ''
        }`
      });
    } else {
      checks.push({
        name: 'exposure',
        status: 'warn',
        detail:
          'no exposure surface configured — the audit assumes the whole database is reachable and caps the score. Declare `exposure.schemas` or use `exposure.resolver: "constructive"`.'
      });
    }
  } catch (err) {
    checks.push({ name: 'exposure', status: 'warn', detail: (err as Error).message });
  }

  return finish(checks);
}

function finish(checks: DoctorCheck[]): DoctorReport {
  return { checks, ok: checks.every((c) => c.status !== 'fail') };
}
