import type { PgCodec, ScopeMeta, ScopeTier } from './types';

/** Scopes with no per-row key column (global-tier registries). */
const GLOBAL_SCOPES = new Set(['platform', 'app']);

/**
 * Candidate scope key columns to look for, in priority order, when a scope
 * does not name its own key column via the smart tag.
 */
const DATABASE_KEY_CANDIDATES = ['database_id'];
const ENTITY_KEY_CANDIDATES = ['entity_id', 'owner_id'];

function tierForScope(scope: string): ScopeTier {
  if (scope === 'database') return 'database';
  if (GLOBAL_SCOPES.has(scope)) return 'global';
  return 'entity';
}

/** Return the first candidate attribute that exists on the codec, else null. */
function firstExistingAttr(
  attributes: Record<string, unknown> | undefined,
  candidates: string[]
): string | null {
  if (!attributes) return null;
  for (const name of candidates) {
    if (name in attributes) return name;
  }
  return null;
}

function resolveKeyColumn(
  scope: string,
  tier: ScopeTier,
  attributes: Record<string, unknown> | undefined,
  explicitKey: string | null
): string | null {
  if (tier === 'global') return null;
  if (explicitKey && attributes && explicitKey in attributes) return explicitKey;
  if (tier === 'database') {
    return firstExistingAttr(attributes, DATABASE_KEY_CANDIDATES);
  }
  // entity tier: try a scope-named key (org → org_id) first, then generics
  return firstExistingAttr(attributes, [`${scope}_id`, ...ENTITY_KEY_CANDIDATES]);
}

/**
 * Detect provisioning scope metadata for a table.
 *
 * Primary source: the `@scope` smart tag emitted by the constructive-db
 * generators (`metaschema.append_table_smart_tags(id, {scope, scopeEntityTable})`),
 * surfaced by PostGraphile as `codec.extensions.tags.scope`.
 *
 * Fallback: infer a `database` scope from a `database_id` column when no tag is
 * present. Platform/app/entity scopes cannot be distinguished from columns
 * alone, so those return null unless the tag is set.
 */
export function buildScopeMeta(
  codec: PgCodec,
  inflectAttr: (attrName: string, codec: PgCodec) => string
): ScopeMeta | null {
  const attributes = codec.attributes;
  const tags = (codec as any).extensions?.tags;

  const rawScope = tags?.scope;
  if (typeof rawScope === 'string' && rawScope.length > 0) {
    const scope = rawScope;
    const tier = tierForScope(scope);
    const explicitKey =
      typeof tags.scopeKey === 'string' && tags.scopeKey.length > 0
        ? tags.scopeKey
        : null;
    const keyAttr = resolveKeyColumn(scope, tier, attributes, explicitKey);
    const entityTable =
      typeof tags.scopeEntityTable === 'string' && tags.scopeEntityTable.length > 0
        ? tags.scopeEntityTable
        : null;
    return {
      scope,
      tier,
      keyColumn: keyAttr ? inflectAttr(keyAttr, codec) : null,
      entityTable,
      source: 'smartTag'
    };
  }

  // Inference fallback: only the database tier is unambiguous from columns.
  const dbKey = firstExistingAttr(attributes, DATABASE_KEY_CANDIDATES);
  if (dbKey) {
    return {
      scope: 'database',
      tier: 'database',
      keyColumn: inflectAttr(dbKey, codec),
      entityTable: null,
      source: 'inferred'
    };
  }

  return null;
}
