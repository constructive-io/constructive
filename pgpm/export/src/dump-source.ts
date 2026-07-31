/**
 * Dump ingestion for `pgpm import`: turn a SQL dump (pg_dump plain format or
 * any plain SQL file) into parseable SQL text for the dials pipeline.
 *
 * pg_dump output is peppered with psql meta-commands and session settings the
 * SQL parser cannot (and should not) consume — those are stripped here;
 * everything else flows through unchanged.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface DumpSource {
  /** Module name derived from the file name (or overridden by the caller). */
  name: string;
  /** Absolute path of the dump file. */
  filePath: string;
  /** Sanitized SQL, safe to hand to the parser. */
  sql: string;
  /** One entry per stripped construct class, for CLI visibility. */
  warnings: string[];
}

/** psql meta-commands: \restrict, \unrestrict, \connect, \echo, ... */
const PSQL_META = /^\s*\\/;
/** Session settings pg_dump emits at the top of every dump. */
const SET_STATEMENT = /^\s*SET\s+[\w.]+\s*(=|TO)\s*[^;]*;\s*$/i;
const SET_CONFIG = /^\s*SELECT\s+pg_catalog\.set_config\s*\(.*\)\s*;\s*$/i;
/** Ownership is environment-specific; dumps replay it, modules must not. */
const OWNER_TO = /^\s*ALTER\s+.*\s+OWNER\s+TO\s+[^;]+;\s*$/i;

interface StripRule {
  pattern: RegExp;
  label: string;
}

const STRIP_RULES: StripRule[] = [
  { pattern: PSQL_META, label: 'psql meta-command (\\...)' },
  { pattern: SET_STATEMENT, label: 'session SET statement' },
  { pattern: SET_CONFIG, label: 'pg_catalog.set_config() call' },
  { pattern: OWNER_TO, label: 'ALTER ... OWNER TO statement' }
];

/**
 * Strip psql meta-commands and session/ownership noise from dump SQL,
 * line-wise (pg_dump emits each of these on its own line). Returns the
 * sanitized SQL and a summary of what was removed.
 */
export const sanitizeDumpSql = (sql: string): { sql: string; warnings: string[] } => {
  const counts = new Map<string, number>();
  const lines = sql.split('\n').filter(line => {
    const rule = STRIP_RULES.find(r => r.pattern.test(line));
    if (rule) {
      counts.set(rule.label, (counts.get(rule.label) ?? 0) + 1);
      return false;
    }
    return true;
  });
  const warnings = [...counts.entries()].map(
    ([label, count]) => `stripped ${count} ${label}${count === 1 ? '' : 's'}`
  );
  return { sql: lines.join('\n').trim(), warnings };
};

/** Load and sanitize a SQL dump file. */
export const loadDumpSource = (dumpFile: string, name?: string): DumpSource => {
  const filePath = path.resolve(dumpFile);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dump file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { sql, warnings } = sanitizeDumpSql(raw);
  return {
    name: name ?? path.basename(filePath).replace(/\.(sql|dump)$/i, ''),
    filePath,
    sql,
    warnings
  };
};
