import type {
  PgAttribute,
  PgCodec,
  ScalarEncodingKind,
  ScalarEncodingMeta
} from './types';

/**
 * Scalar encoding contracts — the one piece of field metadata standard GraphQL
 * introspection can't provide.
 *
 * Introspection tells a client a field's scalar *name* (`GeoJSON`, `LTree`,
 * `Interval`, `BigInt`, `vector`, …) but not how to serialize/parse it or its
 * structural parameters (geometry subtype/SRID, vector dimensions, ltree
 * dot-path semantics). Without that, generated clients treat these as opaque
 * strings / `any` and mis-encode inputs or fail to parse outputs.
 *
 * `kind` is derived deterministically from the *underlying* codec (array and
 * domain wrappers unwrapped first, first match wins) so exactly one kind is
 * ever assigned and nothing can clobber it. Structural extras (subtype, SRID,
 * dimensions) are read verbatim from attribute extensions — never guessed, and
 * `null` when absent.
 */

/** pg type name → encoding kind. Plain scalars are intentionally absent → null. */
const KIND_BY_PG_TYPE: Readonly<Record<string, ScalarEncodingKind>> = {
  int8: 'bigint',
  bigint: 'bigint',
  numeric: 'bigint',
  timestamptz: 'datetime',
  timestamp: 'datetime',
  date: 'date',
  time: 'time',
  timetz: 'time',
  interval: 'interval',
  uuid: 'uuid',
  geometry: 'geojson',
  geography: 'geojson',
  point: 'point',
  inet: 'inet',
  cidr: 'inet',
  ltree: 'ltree',
  vector: 'vector',
  bytea: 'bytea'
};

/** Unwrap array-of and domain-of wrappers to the underlying scalar/record codec. */
function underlyingCodec(codec: PgCodec | null | undefined): PgCodec | null {
  let current = codec ?? null;
  const seen = new Set<PgCodec>();
  while (current && !seen.has(current) && (current.arrayOfCodec || current.domainOfCodec)) {
    seen.add(current);
    current = current.arrayOfCodec || current.domainOfCodec || null;
  }
  return current;
}

/** True when a codec is a composite/record type (has named attributes). */
function isCompositeCodec(codec: PgCodec | null): boolean {
  return !!codec?.attributes && Object.keys(codec.attributes).length > 0;
}

export function buildScalarEncoding(
  attr: PgAttribute | null | undefined
): ScalarEncodingMeta | null {
  const codec = underlyingCodec(attr?.codec);
  if (!codec) return null;

  const ext = attr?.extensions ?? undefined;
  const kind = KIND_BY_PG_TYPE[codec.name];

  if (!kind) {
    // Composite/record types are the only non-mapped scalars worth describing;
    // everything else (text, int, bool, json, enum, …) is fully covered by gqlType.
    if (isCompositeCodec(codec)) {
      return { kind: 'composite', fields: null };
    }
    return null;
  }

  switch (kind) {
    case 'geojson':
      return {
        kind,
        geometrySubtype:
          typeof ext?.geometrySubtype === 'string' ? ext.geometrySubtype : null,
        srid: typeof ext?.geometrySrid === 'number' ? ext.geometrySrid : null
      };
    case 'vector':
      return {
        kind,
        elementType: 'float',
        dimensions:
          typeof ext?.vectorDimensions === 'number' ? ext.vectorDimensions : null
      };
    case 'ltree':
      return { kind, dotPath: true };
    default:
      return { kind };
  }
}
