import { Logger } from '@pgpmjs/logger';
import type { Pool } from 'pg';

const log = new Logger('introspection-query');

/**
 * Low-level introspection fetch + parse.
 *
 * Queries pg_catalog tables directly to get schema structure.
 * Uses BEGIN + SET LOCAL search_path + COMMIT so the search_path
 * never leaks to pooled connections.
 */

/**
 * Fetch raw introspection JSON from the database.
 *
 * @param pool - PostgreSQL connection pool
 * @param schemas - Schema names to introspect
 * @returns Raw JSON string containing introspection data
 */
export async function fetchIntrospection(
  pool: Pool,
  schemas: string[],
): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL search_path TO ${schemas.map((s) => `"${s}"`).join(', ')}`);

    const result = await client.query(`
      SELECT json_build_object(
        'namespaces', (
          SELECT coalesce(json_agg(row_to_json(n)), '[]'::json)
          FROM pg_catalog.pg_namespace n
          WHERE n.nspname = ANY($1)
        ),
        'classes', (
          SELECT coalesce(json_agg(row_to_json(c)), '[]'::json)
          FROM pg_catalog.pg_class c
          JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = ANY($1)
            AND c.relkind IN ('r', 'v', 'm', 'f', 'p')
        ),
        'attributes', (
          SELECT coalesce(json_agg(row_to_json(a)), '[]'::json)
          FROM pg_catalog.pg_attribute a
          JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
          JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = ANY($1)
            AND a.attnum > 0
            AND NOT a.attisdropped
        ),
        'constraints', (
          SELECT coalesce(json_agg(row_to_json(co)), '[]'::json)
          FROM pg_catalog.pg_constraint co
          JOIN pg_catalog.pg_class c ON co.conrelid = c.oid
          JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = ANY($1)
        ),
        'types', (
          SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
          FROM pg_catalog.pg_type t
          JOIN pg_catalog.pg_namespace n ON t.typnamespace = n.oid
          WHERE n.nspname = ANY($1)
        ),
        'procs', (
          SELECT coalesce(json_agg(row_to_json(p)), '[]'::json)
          FROM pg_catalog.pg_proc p
          JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = ANY($1)
        )
      ) AS introspection
    `, [schemas]);

    await client.query('COMMIT');

    return JSON.stringify(result.rows[0].introspection);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    log.error('Introspection query failed', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Parse a raw introspection JSON string into structured data.
 *
 * @param text - Raw JSON string from fetchIntrospection
 * @returns Parsed introspection result
 */
export function parseIntrospection(text: string): import('./fingerprint').MinimalIntrospection {
  try {
    const data = JSON.parse(text);
    return {
      namespaces: data.namespaces || [],
      classes: data.classes || [],
      attributes: data.attributes || [],
      constraints: data.constraints || [],
      types: data.types || [],
      procs: data.procs || [],
    };
  } catch (err) {
    log.error('Failed to parse introspection JSON', err);
    throw err;
  }
}

/**
 * Fetch and parse introspection data in one call.
 *
 * @param pool - PostgreSQL connection pool
 * @param schemas - Schema names to introspect
 * @returns Object with raw JSON string and parsed data
 */
export async function fetchAndParseIntrospection(
  pool: Pool,
  schemas: string[],
): Promise<{ raw: string; parsed: import('./fingerprint').MinimalIntrospection }> {
  const raw = await fetchIntrospection(pool, schemas);
  const parsed = parseIntrospection(raw);
  return { raw, parsed };
}
