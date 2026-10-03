import type { PgErrorFields } from './types';

/** SQLSTATE `insufficient_privilege`: a missing grant or a row-level security refusal. */
export const INSUFFICIENT_PRIVILEGE_SQLSTATE = '42501';

/**
 * PostgreSQL SQLSTATE codes for the native errors we surface as public
 * Constructive codes: constraint violations, and privilege refusals (a missing
 * grant or an RLS policy) as `FORBIDDEN`.
 */
export const SQLSTATE_TO_CODE: Record<string, string> = {
  [INSUFFICIENT_PRIVILEGE_SQLSTATE]: 'FORBIDDEN',
  23505: 'UNIQUE_VIOLATION',
  23503: 'FOREIGN_KEY_VIOLATION',
  23502: 'NOT_NULL_VIOLATION',
  23514: 'CHECK_VIOLATION',
  '23P01': 'EXCLUSION_VIOLATION'
};

/** SQLSTATE for a user-raised `RAISE EXCEPTION` without an explicit ERRCODE. */
export const RAISE_EXCEPTION_SQLSTATE = 'P0001';

/**
 * Extract extended PostgreSQL error fields from an error-like object. Returns
 * `null` when the value does not look like a pg error (no `code`/`detail`/
 * `where`).
 */
export function extractPgErrorFields(err: unknown): PgErrorFields | null {
  if (!err || typeof err !== 'object') return null;

  const e = err as Record<string, unknown>;
  if (!e.code && !e.detail && !e.where) return null;

  const fields: PgErrorFields = {};
  const assign = (key: keyof PgErrorFields) => {
    const value = e[key];
    if (typeof value === 'string') fields[key] = value;
  };

  (
    [
      'code',
      'detail',
      'hint',
      'where',
      'position',
      'internalPosition',
      'internalQuery',
      'schema',
      'table',
      'column',
      'dataType',
      'constraint',
      'file',
      'line',
      'routine'
    ] as (keyof PgErrorFields)[]
  ).forEach(assign);

  return fields;
}
