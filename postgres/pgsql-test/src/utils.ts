import { 
  extractPgErrorFields, 
  formatPgErrorFields, 
  formatPgError,
  type PgErrorFields,
  type PgErrorContext
} from '@pgpmjs/types';

// Re-export PostgreSQL error formatting utilities
export { 
  extractPgErrorFields, 
  formatPgErrorFields, 
  formatPgError,
  type PgErrorFields,
  type PgErrorContext
};

/**
 * Extract the error code from an error message.
 * 
 * Enhanced error messages from PgTestClient include additional context on subsequent lines
 * (Where, Query, Values, etc.). This function returns only the first line, which contains
 * the actual error code raised by PostgreSQL.
 * 
 * @param message - The error message (may contain multiple lines with debug context)
 * @returns The first line of the error message (the error code)
 * 
 * @example
 * // Error message with enhanced context:
 * // "NONEXISTENT_TYPE\nWhere: PL/pgSQL function...\nQuery: INSERT INTO..."
 * getErrorCode(err.message) // => "NONEXISTENT_TYPE"
 */
export function getErrorCode(message: string): string {
  return message.split('\n')[0];
}

const uuidRegexp= /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ID hash map for tracking ID relationships in snapshots
// Values can be numbers (e.g., 1 -> [ID-1]) or strings (e.g., 'user2' -> [ID-user2])
export type IdHash = Record<string, number | string>;

const idReplacement = (v: unknown, idHash?: IdHash): string | unknown => {
  if (!v) return v;
  if (!idHash) return '[ID]';
  const key = String(v);
  return idHash[key] !== undefined ? `[ID-${idHash[key]}]` : '[ID]';
};

// Generic object type for any key-value mapping
type AnyObject = Record<string, any>;

function mapValues<T extends AnyObject, R = any>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => R
): Record<keyof T, R> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[key as keyof T] = fn(value, key as keyof T);
    return acc;
  }, {} as Record<keyof T, R>);
}

export const pruneDates = (row: AnyObject): AnyObject =>
  mapValues(row, (v, k) => {
    if (!v) {
      return v;
    }
    if (v instanceof Date) {
      return '[DATE]';
    } else if (
      typeof v === 'string' &&
      /(_at|At)$/.test(k as string) &&
      /^20[0-9]{2}-[0-9]{2}-[0-9]{2}/.test(v)
    ) {
      return '[DATE]';
    }
    return v;
  });

export const pruneIds = (row: AnyObject, idHash?: IdHash): AnyObject =>
  mapValues(row, (v, k) =>
    (k === 'id' || k === 'rowId' || (typeof k === 'string' && k.endsWith('_id'))) &&
      (typeof v === 'string' || typeof v === 'number')
      ? idReplacement(v, idHash)
      : v
  );

export const pruneIdArrays = (row: AnyObject): AnyObject =>
  mapValues(row, (v, k) =>
    typeof k === 'string' && k.endsWith('_ids') && Array.isArray(v)
      ? `[UUIDs-${v.length}]`
      : v
  );

export const pruneUUIDs = (row: AnyObject): AnyObject =>
  mapValues(row, (v, k) => {
    if (typeof v !== 'string') {
      return v;
    }
    if (['uuid', 'queue_name'].includes(k as string) && uuidRegexp.test(v)) {
      return '[UUID]';
    }
    if (k === 'gravatar' && /^[0-9a-f]{32}$/i.test(v)) {
      return '[gUUID]';
    }
    return v;
  });

export const pruneHashes = (row: AnyObject): AnyObject =>
  mapValues(row, (v, k) =>
    typeof k === 'string' &&
      k.endsWith('_hash') &&
      typeof v === 'string' &&
      v.startsWith('$')
      ? '[hash]'
      : v
  );

export const pruneSchemas = (row: AnyObject): AnyObject =>
  mapValues(row, (v, k) =>
    typeof v === 'string' && /^zz-/.test(v) ? '[schemahash]' : v
  );

export const prunePeoplestamps = (row: AnyObject): AnyObject =>
  mapValues(row, (v, k) =>
    k.endsWith('_by') && typeof v === 'string' ? '[peoplestamp]' : v
  );

export const pruneTokens = (row: AnyObject): AnyObject =>
  mapValues(row, (v, k) =>
    (k === 'token' || k.endsWith('_token')) && typeof v === 'string'
      ? '[token]'
      : v
  );

// Compose multiple pruners into a single pruner
type Pruner = (row: AnyObject) => AnyObject;

export const composePruners = (...pruners: Pruner[]): Pruner =>
  (row: AnyObject): AnyObject =>
    pruners.reduce((acc, pruner) => pruner(acc), row);

// Pruner with optional IdHash support
type PrunerWithIdHash = (row: AnyObject, idHash?: IdHash) => AnyObject;

// Default pruners used by prune/snapshot (without IdHash)
export const defaultPruners: Pruner[] = [
  pruneTokens,
  prunePeoplestamps,
  pruneDates,
  pruneIdArrays,
  pruneUUIDs,
  pruneHashes
];

// Compose pruners and apply pruneIds with IdHash support
export const prune = (row: AnyObject, idHash?: IdHash): AnyObject => {
  const pruned = composePruners(...defaultPruners)(row);
  return pruneIds(pruned, idHash);
};

// Factory to create a snapshot function with custom pruners
export const createSnapshot = (pruners: Pruner[]) => {
  const pruneFn = composePruners(...pruners);
  const snap = (obj: unknown, idHash?: IdHash): unknown => {
    if (Array.isArray(obj)) {
      return obj.map((el) => snap(el, idHash));
    } else if (obj && typeof obj === 'object') {
      const pruned = pruneFn(obj as AnyObject);
      const prunedWithIds = pruneIds(pruned, idHash);
      return mapValues(prunedWithIds, (v) => snap(v, idHash));
    }
    return obj;
  };
  return snap;
};

export const snapshot = createSnapshot(defaultPruners);
