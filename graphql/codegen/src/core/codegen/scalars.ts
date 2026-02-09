/**
 * Shared scalar mappings for code generation
 */

export const SCALAR_TS_MAP: Record<string, string> = {
  // Standard GraphQL scalars
  String: 'string',
  Int: 'number',
  Float: 'number',
  Boolean: 'boolean',
  ID: 'string',

  // PostGraphile scalars
  UUID: 'string',
  Cursor: 'string',
  Datetime: 'string',
  Date: 'string',
  Time: 'string',
  JSON: 'unknown',
  BigInt: 'string',
  BigFloat: 'string',

  // Geometry types
  GeoJSON: 'unknown',
  Geometry: 'unknown',
  GeometryPoint: 'unknown',
  Point: 'unknown',

  // Interval
  Interval: 'string',

  // PostgreSQL-specific types
  BitString: 'string',
  FullText: 'string',
  InternetAddress: 'string',
  Inet: 'string',
  Cidr: 'string',
  MacAddr: 'string',
  TsVector: 'string',
  TsQuery: 'string',

  // File upload
  Upload: 'File',
};

export const SCALAR_FILTER_MAP: Record<string, string> = {
  String: 'StringFilter',
  Int: 'IntFilter',
  Float: 'FloatFilter',
  Boolean: 'BooleanFilter',
  UUID: 'UUIDFilter',
  ID: 'UUIDFilter',
  Datetime: 'DatetimeFilter',
  Date: 'DateFilter',
  Time: 'StringFilter',
  JSON: 'JSONFilter',
  BigInt: 'BigIntFilter',
  BigFloat: 'BigFloatFilter',
  BitString: 'BitStringFilter',
  InternetAddress: 'InternetAddressFilter',
  FullText: 'FullTextFilter',
  Interval: 'StringFilter',
};

export const SCALAR_NAMES = new Set(Object.keys(SCALAR_TS_MAP));

/** Scalars that have list filter variants (e.g., StringListFilter) */
const LIST_FILTER_SCALARS = new Set(['String', 'Int', 'UUID']);

/** All base filter type names - skip these in schema-types.ts to avoid duplicates */
export const BASE_FILTER_TYPE_NAMES = new Set([
  ...new Set(Object.values(SCALAR_FILTER_MAP)),
  ...Array.from(LIST_FILTER_SCALARS).map((s) => `${s}ListFilter`),
]);

export function scalarToTsType(
  scalarName: string,
  options: {
    unknownScalar?: 'unknown' | 'name';
    overrides?: Record<string, string>;
  } = {},
): string {
  return (
    options.overrides?.[scalarName] ??
    SCALAR_TS_MAP[scalarName] ??
    (options.unknownScalar === 'unknown' ? 'unknown' : scalarName)
  );
}

/** Get the filter type for a scalar (handles both scalar and array types) */
export function scalarToFilterType(
  scalarName: string,
  isArray = false,
): string | null {
  const baseName = scalarName === 'ID' ? 'UUID' : scalarName;
  if (isArray) {
    return LIST_FILTER_SCALARS.has(baseName) ? `${baseName}ListFilter` : null;
  }
  return SCALAR_FILTER_MAP[scalarName] ?? null;
}
