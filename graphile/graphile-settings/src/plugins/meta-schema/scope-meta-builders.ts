import type { PgCodec, ScopeMeta, ScopeTier } from './types';

const VALID_TIERS = new Set<ScopeTier>(['global', 'database', 'entity']);

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Detect provisioning scope metadata for a table.
 *
 * The `@scope` smart tag emitted by the constructive-db generators is the sole
 * source of truth. `apply_scope_fields` knows the exact scope, tier, key column,
 * and entity table, and emits them via
 * `metaschema.append_table_smart_tags(id, { scope, scopeTier, scopeKey, scopeEntityTable })`.
 * PostGraphile surfaces these as `codec.extensions.tags.*`.
 *
 * There is NO inference from column names — a table without the tag returns
 * `null` (the same convention as every other nullable metadata block). This
 * avoids guessing key columns, whose names are chosen freely by each generator.
 */
export function buildScopeMeta(
  codec: PgCodec,
  inflectAttr: (attrName: string, codec: PgCodec) => string
): ScopeMeta | null {
  const tags = (codec as any).extensions?.tags;

  const scope = readString(tags?.scope);
  if (!scope) return null;

  const rawTier = readString(tags.scopeTier);
  const tier =
    rawTier && VALID_TIERS.has(rawTier as ScopeTier)
      ? (rawTier as ScopeTier)
      : null;
  if (!tier) {
    throw new Error(
      `@scope tag on codec "${codec.name}" is missing a valid scopeTier ` +
        `(expected one of global|database|entity, got ${JSON.stringify(rawTier)})`
    );
  }

  const keyColumn = readString(tags.scopeKey);
  const entityTable = readString(tags.scopeEntityTable);

  return {
    scope,
    tier,
    keyColumn: keyColumn ? inflectAttr(keyColumn, codec) : null,
    entityTable,
    source: 'smartTag'
  };
}
