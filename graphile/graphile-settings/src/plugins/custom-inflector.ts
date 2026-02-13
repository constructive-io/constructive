import type { GraphileConfig } from 'graphile-config';
import {
  singularize,
  pluralize,
  singularizeLast,
  pluralizeLast,
  distinctPluralize,
  fixCapitalisedPlural,
  camelize,
} from 'inflekt';

/**
 * Custom inflector plugin for Constructive using the inflekt library.
 *
 * This plugin provides inflection rules based on the inflekt package from dev-utils.
 * It gives us full control over naming conventions and handles Latin plural suffixes
 * correctly (e.g., "schemata" -> "schema" instead of "schematum").
 *
 * Key features:
 * - Uses inflekt for pluralization/singularization with PostGraphile-compatible Latin handling
 * - Simplifies field names (allUsers -> users, postsByAuthorId -> posts)
 * - Customizable opposite name mappings for relations
 */

/**
 * Custom opposite name mappings for relations.
 * For example, if you have a `parent_id` column, this determines
 * what the reverse relation should be called.
 *
 * Add your own mappings here as needed.
 */
const CUSTOM_OPPOSITES: Record<string, string> = {
  parent: 'child',
  child: 'parent',
  author: 'authored',
  editor: 'edited',
  reviewer: 'reviewed',
  owner: 'owned',
  creator: 'created',
  updater: 'updated',
};

/**
 * Extract base name from attribute names like "author_id" -> "author"
 */
function getBaseName(attributeName: string): string | null {
  const matches = attributeName.match(
    /^(.+?)(_row_id|_id|_uuid|_fk|_pk|RowId|Id|Uuid|UUID|Fk|Pk)$/
  );
  if (matches) {
    return matches[1];
  }
  return null;
}

/**
 * Check if a base name matches another name (singularized)
 */
function baseNameMatches(baseName: string, otherName: string): boolean {
  const singularizedName = singularize(otherName);
  return camelize(baseName, true) === camelize(singularizedName, true);
}

/**
 * Get the opposite name for a relation base name
 */
function getOppositeBaseName(baseName: string): string | null {
  return CUSTOM_OPPOSITES[baseName] || null;
}

/**
 * Returns true if array1 and array2 have the same length and values
 */
function arraysMatch<T>(
  array1: readonly T[],
  array2: readonly T[],
  comparator: (v1: T, v2: T) => boolean = (v1, v2) => v1 === v2
): boolean {
  if (array1 === array2) return true;
  const l = array1.length;
  if (l !== array2.length) return false;
  for (let i = 0; i < l; i++) {
    if (!comparator(array1[i], array2[i])) return false;
  }
  return true;
}

export const InflektPlugin: GraphileConfig.Plugin = {
  name: 'InflektPlugin',
  version: '1.0.0',

  inflection: {
    replace: {
      /**
       * Remove schema prefixes from all schemas.
       *
       * WHY THIS EXISTS:
       * PostGraphile v5's default `_schemaPrefix` inflector only removes the prefix
       * for the FIRST schema in the pgServices.schemas array. All other schemas get
       * prefixed with their schema name (e.g., "services_public_api" -> "servicesPublicApi").
       *
       * This is problematic for multi-schema setups where you want clean, consistent
       * naming across all schemas.
       *
       * SOURCE CODE REFERENCE:
       * https://github.com/graphile/crystal/blob/924b2515c6bd30e5905ac1419a25244b40c8bb4d/graphile-build/graphile-build-pg/src/plugins/PgTablesPlugin.ts#L261-L271
       *
       * The relevant v5 code:
       * ```typescript
       * _schemaPrefix(options, { pgNamespace, serviceName }) {
       *   const pgService = options.pgServices?.find((db) => db.name === serviceName);
       *   const databasePrefix = serviceName === "main" ? "" : `${serviceName}_`;
       *   const schemaPrefix =
       *     pgNamespace.nspname === pgService?.schemas?.[0]  // <-- Only first schema!
       *       ? ""
       *       : `${pgNamespace.nspname}_`;
       *   return `${databasePrefix}${schemaPrefix}`;
       * }
       * ```
       *
       * OUR FIX:
       * We override this to always return an empty string, giving clean names for
       * all schemas. Use the ConflictDetectorPlugin to detect naming conflicts.
       *
       * WARNING: This may cause naming conflicts if you have tables with the
       * same name in different schemas. Use @name smart tags to disambiguate.
       */
      _schemaPrefix(_previous, _options, _details) {
        return '';
      },

      /**
       * Keep `id` columns as `id` instead of renaming to `rowId`.
       *
       * WHY THIS EXISTS:
       * PostGraphile v5's default `_attributeName` inflector renames any column
       * named "id" to "row_id" to avoid conflicts with the Relay Global Object
       * Identification spec's `id` field. Since we don't use Relay/Node (we use
       * UUIDs), there's no conflict to avoid.
       *
       * NOTE: Disabling NodePlugin does NOT fix this! The renaming happens in
       * PgAttributesPlugin which is a core plugin we need for basic column
       * functionality.
       *
       * SOURCE CODE REFERENCE:
       * https://github.com/graphile/crystal/blob/924b2515c6bd30e5905ac1419a25244b40c8bb4d/graphile-build/graphile-build-pg/src/plugins/PgAttributesPlugin.ts#L289-L298
       *
       * The relevant v5 code:
       * ```typescript
       * _attributeName(options, { attributeName, codec, skipRowId }) {
       *   const attribute = codec.attributes[attributeName];
       *   const name = attribute.extensions?.tags?.name || attributeName;
       *   // Avoid conflict with 'id' field used for Relay.
       *   const nonconflictName =
       *     !skipRowId && name.toLowerCase() === "id" && !codec.isAnonymous
       *       ? "row_id"  // <-- This renames id to row_id!
       *       : name;
       *   return this.coerceToGraphQLName(nonconflictName);
       * }
       * ```
       *
       * OUR FIX:
       * We override this to always use the original attribute name, never
       * renaming `id` to `row_id`. Since we use UUIDs and don't use Relay,
       * there's no naming conflict.
       */
      _attributeName(
        _previous,
        _options,
        details: { attributeName: string; codec: { attributes: Record<string, { extensions?: { tags?: { name?: string } } }> } }
      ) {
        const attribute = details.codec.attributes[details.attributeName];
        const name = attribute?.extensions?.tags?.name || details.attributeName;
        return this.coerceToGraphQLName(name);
      },

      /**
       * Fix capitalized plurals (e.g., "Table1S" -> "Table1s")
       */
      camelCase(previous, _preset, str) {
        const original = previous!(str);
        return fixCapitalisedPlural(original);
      },

      upperCamelCase(previous, _preset, str) {
        const original = previous!(str);
        return fixCapitalisedPlural(original);
      },

      /**
       * Use inflekt's singularize/pluralize which only changes the last word
       */
      pluralize(_previous, _preset, str) {
        return pluralizeLast(str);
      },

      singularize(_previous, _preset, str) {
        return singularizeLast(str);
      },

      /**
       * Simplify root query connection fields (allUsers -> users)
       */
      allRowsConnection(_previous, _options, resource) {
        const resourceName = this._singularizedResourceName(resource);
        return camelize(distinctPluralize(resourceName), true);
      },

      /**
       * Simplify root query list fields
       */
      allRowsList(_previous, _options, resource) {
        const resourceName = this._singularizedResourceName(resource);
        return camelize(distinctPluralize(resourceName), true) + 'List';
      },

      /**
       * Simplify single relation field names (userByAuthorId -> author)
       */
      singleRelation(previous, _options, details) {
        const { registry, codec, relationName } = details;
        const relation = registry.pgRelations[codec.name]?.[relationName];
        if (typeof relation.extensions?.tags?.fieldName === 'string') {
          return relation.extensions.tags.fieldName;
        }

        // Try to extract base name from the local attribute
        if (relation.localAttributes.length === 1) {
          const attributeName = relation.localAttributes[0];
          const baseName = getBaseName(attributeName);
          if (baseName) {
            return camelize(baseName, true);
          }
        }

        // Fall back to the remote resource name
        const foreignPk = relation.remoteResource.uniques.find(
          (u: { isPrimary: boolean }) => u.isPrimary
        );
        if (
          foreignPk &&
          arraysMatch(foreignPk.attributes, relation.remoteAttributes)
        ) {
          return camelize(
            this._singularizedCodecName(relation.remoteResource.codec),
            true
          );
        }
        return previous!(details);
      },

      /**
       * Simplify backwards single relation field names
       */
      singleRelationBackwards(previous, _options, details) {
        const { registry, codec, relationName } = details;
        const relation = registry.pgRelations[codec.name]?.[relationName];
        if (
          typeof relation.extensions?.tags?.foreignSingleFieldName === 'string'
        ) {
          return relation.extensions.tags.foreignSingleFieldName;
        }
        if (typeof relation.extensions?.tags?.foreignFieldName === 'string') {
          return relation.extensions.tags.foreignFieldName;
        }

        // Try to extract base name from the remote attribute
        if (relation.remoteAttributes.length === 1) {
          const attributeName = relation.remoteAttributes[0];
          const baseName = getBaseName(attributeName);
          if (baseName) {
            const oppositeBaseName = getOppositeBaseName(baseName);
            if (oppositeBaseName) {
              return camelize(
                `${oppositeBaseName}_${this._singularizedCodecName(relation.remoteResource.codec)}`,
                true
              );
            }
            if (baseNameMatches(baseName, codec.name)) {
              return camelize(
                this._singularizedCodecName(relation.remoteResource.codec),
                true
              );
            }
          }
        }

        return previous!(details);
      },

      /**
       * Simplify many relation field names (postsByAuthorId -> posts)
       */
      _manyRelation(previous, _options, details) {
        const { registry, codec, relationName } = details;
        const relation = registry.pgRelations[codec.name]?.[relationName];
        const baseOverride = relation.extensions?.tags.foreignFieldName;
        if (typeof baseOverride === 'string') {
          return baseOverride;
        }

        // Try to extract base name from the remote attribute
        if (relation.remoteAttributes.length === 1) {
          const attributeName = relation.remoteAttributes[0];
          const baseName = getBaseName(attributeName);
          if (baseName) {
            const oppositeBaseName = getOppositeBaseName(baseName);
            if (oppositeBaseName) {
              return camelize(
                `${oppositeBaseName}_${distinctPluralize(this._singularizedCodecName(relation.remoteResource.codec))}`,
                true
              );
            }
            if (baseNameMatches(baseName, codec.name)) {
              return camelize(
                distinctPluralize(
                  this._singularizedCodecName(relation.remoteResource.codec)
                ),
                true
              );
            }
          }
        }

        // Fall back to pluralized remote resource name
        const pk = relation.remoteResource.uniques.find(
          (u: { isPrimary: boolean }) => u.isPrimary
        );
        if (pk && arraysMatch(pk.attributes, relation.remoteAttributes)) {
          return camelize(
            distinctPluralize(
              this._singularizedCodecName(relation.remoteResource.codec)
            ),
            true
          );
        }
        return previous!(details);
      },

      /**
       * Simplify many-to-many relation field names with conflict detection.
       *
       * Default pg-many-to-many naming: tagsByPostTagPostIdAndTagId
       * Our simplified naming: tags
       *
       * Falls back to verbose naming if:
       * - Smart tag override exists (manyToManyFieldName)
       * - There's a direct relation to the same target table (would conflict)
       * - There are multiple many-to-many relations to the same target table
       */
      _manyToManyRelation(previous, _options, details) {
        const { leftTable, rightTable, junctionTable, rightRelationName } =
          details;

        const junctionRightRelation = junctionTable.getRelation(rightRelationName);
        const baseOverride =
          junctionRightRelation.extensions?.tags?.manyToManyFieldName;
        if (typeof baseOverride === 'string') {
          return baseOverride;
        }

        const simpleName = camelize(
          distinctPluralize(this._singularizedCodecName(rightTable.codec)),
          true
        );

        const leftRelations = leftTable.getRelations();
        let hasDirectRelation = false;
        let manyToManyCount = 0;

        for (const [_relName, rel] of Object.entries(leftRelations)) {
          if (rel.remoteResource?.codec?.name === rightTable.codec.name) {
            if (!rel.isReferencee) {
              hasDirectRelation = true;
            }
          }
          if (
            rel.isReferencee &&
            rel.remoteResource?.codec?.name !== rightTable.codec.name
          ) {
            const junctionRelations = rel.remoteResource?.getRelations?.() || {};
            for (const [_jRelName, jRel] of Object.entries(junctionRelations)) {
              if (
                !jRel.isReferencee &&
                jRel.remoteResource?.codec?.name === rightTable.codec.name
              ) {
                manyToManyCount++;
              }
            }
          }
        }

        if (hasDirectRelation || manyToManyCount > 1) {
          return previous!(details);
        }

        return simpleName;
      },

      /**
       * Shorten primary key lookups (userById -> user)
       */
      rowByUnique(previous, _options, details) {
        const { unique, resource } = details;
        if (typeof unique.extensions?.tags?.fieldName === 'string') {
          return unique.extensions?.tags?.fieldName;
        }
        if (unique.isPrimary) {
          return camelize(this._singularizedCodecName(resource.codec), true);
        }
        return previous!(details);
      },

      /**
       * Shorten update mutation names
       */
      updateByKeysField(previous, _options, details) {
        const { resource, unique } = details;
        if (typeof unique.extensions?.tags.updateFieldName === 'string') {
          return unique.extensions.tags.updateFieldName;
        }
        if (unique.isPrimary) {
          return camelize(
            `update_${this._singularizedCodecName(resource.codec)}`,
            true
          );
        }
        return previous!(details);
      },

      /**
       * Shorten delete mutation names
       */
      deleteByKeysField(previous, _options, details) {
        const { resource, unique } = details;
        if (typeof unique.extensions?.tags.deleteFieldName === 'string') {
          return unique.extensions.tags.deleteFieldName;
        }
        if (unique.isPrimary) {
          return camelize(
            `delete_${this._singularizedCodecName(resource.codec)}`,
            true
          );
        }
        return previous!(details);
      },

      /**
       * Uppercase enum values to match GraphQL CONSTANT_CASE convention.
       *
       * WHY THIS EXISTS:
       * In PostGraphile v4, custom PostgreSQL enum values (e.g., 'app', 'core', 'module')
       * were automatically uppercased to CONSTANT_CASE ('APP', 'CORE', 'MODULE').
       * In PostGraphile v5, the default `enumValue` inflector preserves the original
       * PostgreSQL casing via `coerceToGraphQLName(value)`, resulting in lowercase
       * enum values in the GraphQL schema.
       *
       * OUR FIX:
       * We call the previous inflector to retain all special character handling
       * (asterisks, symbols, etc.), then uppercase the result to restore v4 behavior.
       */
      enumValue(previous, _options, value, codec) {
        const result = previous!(value, codec);
        return result.toUpperCase();
      },
    },
  },
};

/**
 * Preset that includes the inflekt-based inflector plugin.
 * Use this in your main preset's `extends` array.
 */
export const InflektPreset: GraphileConfig.Preset = {
  plugins: [InflektPlugin],
};

// Re-export for backwards compatibility
export const CustomInflectorPlugin = InflektPlugin;
export const CustomInflectorPreset = InflektPreset;
