import type {
  FieldMeta,
  GqlTypeResolverBuild,
  PgAttribute,
  PgCodec,
} from './types';

const PG_TO_GQL_TYPE: Readonly<Record<string, string>> = {
  text: 'String',
  varchar: 'String',
  char: 'String',
  name: 'String',
  bpchar: 'String',
  uuid: 'UUID',
  int2: 'Int',
  int4: 'Int',
  integer: 'Int',
  int8: 'BigInt',
  bigint: 'BigInt',
  float4: 'Float',
  float8: 'Float',
  numeric: 'BigFloat',
  bool: 'Boolean',
  boolean: 'Boolean',
  timestamptz: 'Datetime',
  timestamp: 'Datetime',
  date: 'Date',
  time: 'Time',
  timetz: 'Time',
  json: 'JSON',
  jsonb: 'JSON',
  interval: 'Interval',
  point: 'Point',
  geometry: 'GeoJSON',
  geography: 'GeoJSON',
  inet: 'InternetAddress',
  cidr: 'InternetAddress',
  xml: 'String',
  bytea: 'String',
  macaddr: 'String',
};

export function pgTypeToGqlType(pgTypeName: string): string {
  return PG_TO_GQL_TYPE[pgTypeName] || pgTypeName;
}

function resolveGqlTypeName(
  build: GqlTypeResolverBuild | undefined,
  codec: PgCodec | null | undefined,
): string {
  if (!codec) return 'unknown';

  try {
    const codecForLookup = codec.arrayOfCodec || codec;
    if (build?.hasGraphQLTypeForPgCodec?.(codecForLookup, 'output')) {
      const resolved = build.getGraphQLTypeNameByPgCodec?.(codecForLookup, 'output');
      if (resolved) return resolved;
    }
  } catch {
    // Fall through to static fallback mapping.
  }

  const pgTypeName = codec.name || 'unknown';
  const mapped = pgTypeToGqlType(pgTypeName);
  if (mapped !== pgTypeName) return mapped;

  const nestedTypeName = codec.arrayOfCodec?.name;
  return nestedTypeName ? pgTypeToGqlType(nestedTypeName) : pgTypeName;
}

export function buildFieldMeta(
  name: string,
  attr: PgAttribute | null | undefined,
  build?: GqlTypeResolverBuild,
): FieldMeta {
  const pgType = attr?.codec?.name || 'unknown';
  const isNotNull = attr?.notNull || false;
  const hasDefault = attr?.hasDefault || false;

  return {
    name,
    type: {
      pgType,
      gqlType: build ? resolveGqlTypeName(build, attr?.codec) : pgTypeToGqlType(pgType),
      isArray: !!attr?.codec?.arrayOfCodec,
      isNotNull,
      hasDefault,
    },
    isNotNull,
    hasDefault,
  };
}
