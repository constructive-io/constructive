import type { GraphileConfig } from 'graphile-config';

/**
 * InflectorLoggerPlugin - Logs inflector calls during schema build for debugging.
 *
 * This plugin wraps key inflectors to log what fields are being generated and why.
 * It passes through to the default behavior but logs the inputs and outputs.
 *
 * WHEN DO PLUGINS RUN?
 * Plugins only run at BUILD TIME, not on every request. The schema is built once
 * and cached. This means logging only happens during schema generation, not during
 * query execution.
 *
 * SOURCE CODE REFERENCES:
 *
 * 1. PgRowByUniquePlugin - Creates root Query fields for unique constraints
 *    (e.g., `userById`, `userByEmail`, `postBySlug`)
 *    https://github.com/graphile/crystal/blob/924b2515c6bd30e5905ac1419a25244b40c8bb4d/graphile-build/graphile-build-pg/src/plugins/PgRowByUniquePlugin.ts#L42-L257
 *
 * 2. PgRelationsPlugin - Creates relationship fields on types for foreign keys
 *    - Forward relations: `post.author` (from posts.author_id -> users.id)
 *    - Backward relations: `user.posts` (from users.id <- posts.author_id)
 *    https://github.com/graphile/crystal/blob/924b2515c6bd30e5905ac1419a25244b40c8bb4d/graphile-build/graphile-build-pg/src/plugins/PgRelationsPlugin.ts#L167-L638
 *
 * 3. PgAttributesPlugin - Creates fields for table columns
 *    Also contains the `_attributeName` inflector that renames `id` to `rowId`
 *    https://github.com/graphile/crystal/blob/924b2515c6bd30e5905ac1419a25244b40c8bb4d/graphile-build/graphile-build-pg/src/plugins/PgAttributesPlugin.ts#L289-L298
 *
 * 4. PgTablesPlugin - Creates GraphQL types for tables
 *    Contains the `_schemaPrefix` inflector that adds schema prefixes
 *    https://github.com/graphile/crystal/blob/924b2515c6bd30e5905ac1419a25244b40c8bb4d/graphile-build/graphile-build-pg/src/plugins/PgTablesPlugin.ts#L261-L271
 *
 * USAGE:
 * Add InflectorLoggerPlugin to your preset's plugins array.
 * Set INFLECTOR_LOG=1 environment variable to enable logging.
 */

const LOG_ENABLED = process.env.INFLECTOR_LOG === '1';

function log(category: string, message: string, details?: Record<string, unknown>) {
  if (!LOG_ENABLED) return;
  const detailsStr = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[Inflector:${category}]${detailsStr} => ${message}`);
}

export const InflectorLoggerPlugin: GraphileConfig.Plugin = {
  name: 'InflectorLoggerPlugin',
  version: '1.0.0',
  description: 'Logs inflector calls during schema build for debugging',

  inflection: {
    replace: {
      /**
       * Logs when root Query fields are created for unique constraints.
       * Source: PgRowByUniquePlugin
       * https://github.com/graphile/crystal/blob/924b2515c6bd30e5905ac1419a25244b40c8bb4d/graphile-build/graphile-build-pg/src/plugins/PgRowByUniquePlugin.ts#L50-L63
       */
      rowByUnique(previous, _options, details) {
        const result = previous!(details);
        const { unique, resource } = details;
        log('rowByUnique', result, {
          resource: resource.name,
          uniqueAttributes: unique.attributes,
          isPrimary: unique.isPrimary,
        });
        return result;
      },

      /**
       * Logs when forward relation fields are created (e.g., post.author).
       * Source: PgRelationsPlugin
       * https://github.com/graphile/crystal/blob/924b2515c6bd30e5905ac1419a25244b40c8bb4d/graphile-build/graphile-build-pg/src/plugins/PgRelationsPlugin.ts#L228-L230
       */
      singleRelation(previous, _options, details) {
        const result = previous!(details);
        const { codec, relationName, registry } = details;
        const relation = registry.pgRelations[codec.name]?.[relationName];
        log('singleRelation', result, {
          fromType: codec.name,
          relationName,
          toType: relation?.remoteResource?.name,
          localAttributes: relation?.localAttributes,
        });
        return result;
      },

      /**
       * Logs when backward single relation fields are created.
       * Source: PgRelationsPlugin
       * https://github.com/graphile/crystal/blob/924b2515c6bd30e5905ac1419a25244b40c8bb4d/graphile-build/graphile-build-pg/src/plugins/PgRelationsPlugin.ts#L250-L252
       */
      singleRelationBackwards(previous, _options, details) {
        const result = previous!(details);
        const { codec, relationName, registry } = details;
        const relation = registry.pgRelations[codec.name]?.[relationName];
        log('singleRelationBackwards', result, {
          fromType: codec.name,
          relationName,
          toType: relation?.remoteResource?.name,
          remoteAttributes: relation?.remoteAttributes,
        });
        return result;
      },

      /**
       * Logs when many-relation fields are created (e.g., user.posts).
       * Source: PgRelationsPlugin
       * https://github.com/graphile/crystal/blob/924b2515c6bd30e5905ac1419a25244b40c8bb4d/graphile-build/graphile-build-pg/src/plugins/PgRelationsPlugin.ts#L268-L270
       */
      _manyRelation(previous, _options, details) {
        const result = previous!(details);
        const { codec, relationName, registry } = details;
        const relation = registry.pgRelations[codec.name]?.[relationName];
        log('manyRelation', result, {
          fromType: codec.name,
          relationName,
          toType: relation?.remoteResource?.name,
          remoteAttributes: relation?.remoteAttributes,
        });
        return result;
      },

      /**
       * Logs when connection fields are created for many relations.
       * Source: PgRelationsPlugin
       * https://github.com/graphile/crystal/blob/924b2515c6bd30e5905ac1419a25244b40c8bb4d/graphile-build/graphile-build-pg/src/plugins/PgRelationsPlugin.ts#L271-L279
       */
      manyRelationConnection(previous, _options, details) {
        const result = previous!(details);
        const { codec, relationName } = details;
        log('manyRelationConnection', result, {
          fromType: codec.name,
          relationName,
        });
        return result;
      },

      /**
       * Logs when list fields are created for many relations.
       * Source: PgRelationsPlugin
       * https://github.com/graphile/crystal/blob/924b2515c6bd30e5905ac1419a25244b40c8bb4d/graphile-build/graphile-build-pg/src/plugins/PgRelationsPlugin.ts#L280-L288
       */
      manyRelationList(previous, _options, details) {
        const result = previous!(details);
        const { codec, relationName } = details;
        log('manyRelationList', result, {
          fromType: codec.name,
          relationName,
        });
        return result;
      },

      /**
       * Logs when root connection fields are created (e.g., Query.users).
       * Source: PgAllRowsPlugin
       */
      allRowsConnection(previous, _options, resource) {
        const result = previous!(resource);
        log('allRowsConnection', result, {
          resource: resource.name,
        });
        return result;
      },

      /**
       * Logs when update mutation fields are created.
       * Source: PgMutationUpdateDeletePlugin
       */
      updateByKeysField(previous, _options, details) {
        const result = previous!(details);
        const { resource, unique } = details;
        log('updateByKeysField', result, {
          resource: resource.name,
          uniqueAttributes: unique.attributes,
          isPrimary: unique.isPrimary,
        });
        return result;
      },

      /**
       * Logs when delete mutation fields are created.
       * Source: PgMutationUpdateDeletePlugin
       */
      deleteByKeysField(previous, _options, details) {
        const result = previous!(details);
        const { resource, unique } = details;
        log('deleteByKeysField', result, {
          resource: resource.name,
          uniqueAttributes: unique.attributes,
          isPrimary: unique.isPrimary,
        });
        return result;
      },

      /**
       * Logs when attribute (column) fields are created.
       * Source: PgAttributesPlugin
       * https://github.com/graphile/crystal/blob/924b2515c6bd30e5905ac1419a25244b40c8bb4d/graphile-build/graphile-build-pg/src/plugins/PgAttributesPlugin.ts#L289-L298
       */
      attribute(previous, _options, details) {
        const result = previous!(details);
        const { attributeName, codec } = details;
        log('attribute', result, {
          codec: codec.name,
          attributeName,
        });
        return result;
      },

      /**
       * Logs when table types are created.
       * Source: PgTablesPlugin
       */
      tableType(previous, _options, codec) {
        const result = previous!(codec);
        log('tableType', result, {
          codec: codec.name,
        });
        return result;
      },
    },
  },
};

/**
 * Preset that includes the inflector logger plugin.
 * Use this in your main preset's `extends` array.
 */
export const InflectorLoggerPreset: GraphileConfig.Preset = {
  plugins: [InflectorLoggerPlugin],
};
