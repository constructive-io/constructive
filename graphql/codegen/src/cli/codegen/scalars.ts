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

export interface ScalarToTsOptions {
  unknownScalar?: 'unknown' | 'name';
  overrides?: Record<string, string>;
}

export function scalarToTsType(
  scalarName: string,
  options: ScalarToTsOptions = {}
): string {
  const override = options.overrides?.[scalarName];
  if (override) return override;

  const mapped = SCALAR_TS_MAP[scalarName];
  if (mapped) return mapped;

  return options.unknownScalar === 'unknown' ? 'unknown' : scalarName;
}

export function scalarToFilterType(scalarName: string): string | null {
  return SCALAR_FILTER_MAP[scalarName] ?? null;
}
