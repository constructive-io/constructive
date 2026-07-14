import type {
  PgCodec,
  PgRegistry,
  PgResource,
  PgResourceParameter
} from '@dataplan/pg';

/**
 * Whether a pgResource is a computed scalar attribute function, i.e. one that:
 * - takes at least one parameter,
 * - returns a scalar (its codec has no attributes),
 * - is unique (returns a single row),
 * - and takes a table row as its first parameter (that parameter's codec has
 *   attributes).
 *
 * Shared by the connection-filter and pg-aggregates plugins, which both need
 * to recognise computed columns exposed as functions.
 */
export function isComputedScalarAttributeResource(
  s: PgResource<any, any, any, any, any>
): s is PgResource<
  string,
  PgCodec,
  never[],
  PgResourceParameter[],
  PgRegistry
> {
  if (!s.parameters || s.parameters.length < 1) {
    return false;
  }
  if (s.codec.attributes) {
    return false;
  }
  if (!s.isUnique) {
    return false;
  }
  const firstParameter = s.parameters[0] as PgResourceParameter;
  if (!firstParameter?.codec.attributes) {
    return false;
  }
  return true;
}
