import type { QueryExecutor } from './introspect';

/** `pg_proc.provolatile`: `i` immutable, `s` stable, `v` volatile. */
export type Volatility = 'i' | 's' | 'v';

export interface ProcVolatility {
  /** Schema-qualified name, or bare name if in `pg_catalog` / a common system schema. */
  name: string;
  volatility: Volatility;
  isSecurityDefiner: boolean;
  /** True if this is a built-in / system function (we usually allow-list these). */
  isSystem: boolean;
}

const SYSTEM_SCHEMAS = new Set([
  'pg_catalog',
  'information_schema',
  'pg_toast'
]);

/**
 * Look up `(schema, name)` tuples in pg_proc and return their volatility.
 * Returns a map keyed by the two names the AST walker might see:
 *   - `schema.name` (schema-qualified)
 *   - `name` (unqualified; only used when the function lives in `pg_catalog`)
 */
export async function lookupVolatility(
  exec: QueryExecutor,
  names: Array<{ schema?: string; name: string }>
): Promise<Map<string, ProcVolatility>> {
  if (names.length === 0) return new Map();

  // Dedupe input.
  const seen = new Set<string>();
  const deduped = names.filter((n) => {
    const key = `${n.schema ?? ''}.${n.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const { rows } = await exec.query<{
    schema: string;
    proname: string;
    volatility: Volatility;
    security_definer: boolean;
  }>(
    `
    SELECT
      n.nspname     AS schema,
      p.proname     AS proname,
      p.provolatile AS volatility,
      p.prosecdef   AS security_definer
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE (n.nspname, p.proname) IN (
      SELECT unnest($1::text[]), unnest($2::text[])
    )
    `,
    [
      deduped.map((n) => n.schema ?? 'pg_catalog'),
      deduped.map((n) => n.name)
    ]
  );

  const map = new Map<string, ProcVolatility>();
  for (const r of rows) {
    const info: ProcVolatility = {
      name: `${r.schema}.${r.proname}`,
      volatility: r.volatility,
      isSecurityDefiner: r.security_definer,
      isSystem: SYSTEM_SCHEMAS.has(r.schema)
    };
    map.set(`${r.schema}.${r.proname}`, info);
    if (r.schema === 'pg_catalog') {
      map.set(r.proname, info);
    }
  }

  return map;
}
