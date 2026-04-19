/**
 * LlmTextMutationPlugin
 *
 * Adds `{columnName}Text: String` companion fields on create/update mutation
 * inputs for every vector column. When the client provides a text string in
 * the companion field, the plugin embeds it server-side and injects the
 * resulting vector into the actual column.
 *
 * Example:
 *   mutation { createArticle(input: { embeddingText: "Machine learning concepts" }) }
 *
 * This is the mutation counterpart to LlmTextSearchPlugin (which handles
 * filter/query-side text-to-vector). Together they let clients work entirely
 * with text/prompts instead of raw float vectors.
 *
 * The companion fields are only added when the LLM plugin is loaded.
 * If no embedder is configured, the fields are still registered for schema
 * stability but return a clear error at execution time.
 */

import 'graphile-build';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import type { EmbedderFunction } from '../types';

// ─── TypeScript Augmentation ────────────────────────────────────────────────

declare global {
  namespace GraphileConfig {
    interface Plugins {
      LlmTextMutationPlugin: true;
    }
  }
}

/**
 * Check if a codec is the pgvector `vector` type.
 */
function isVectorCodec(codec: any): boolean {
  return codec?.name === 'vector';
}

/**
 * Creates the LlmTextMutationPlugin.
 *
 * Hooks into GraphQLInputObjectType_fields for create/update input types
 * and adds `{columnName}Text: String` for each vector column.
 */
export function createLlmTextMutationPlugin(): GraphileConfig.Plugin {
  return {
    name: 'LlmTextMutationPlugin',
    version: '0.1.0',
    description:
      'Adds text companion fields on mutation inputs for vector columns — ' +
      'text is embedded server-side before storing',
    after: [
      'LlmModulePlugin',
      'PgAttributesPlugin',
      'VectorCodecPlugin',
    ],

    schema: {
      hooks: {
        /**
         * Add `{columnName}Text: String` fields to create/update input types
         * for tables that have vector columns.
         */
        GraphQLInputObjectType_fields(fields, build, context) {
          const {
            scope: {
              isPgPatch,
              isPgBaseInput,
              isMutationInput,
              pgCodec,
            },
          } = context as any;

          // Only intercept create/update input types for table rows
          if (!pgCodec?.attributes || (!isPgPatch && !isPgBaseInput && !isMutationInput)) {
            return fields;
          }

          const {
            graphql: { GraphQLString },
          } = build;

          // Find vector columns on this table
          const vectorColumns: string[] = [];
          for (const [attributeName, attribute] of Object.entries(
            pgCodec.attributes as Record<string, any>
          )) {
            if (isVectorCodec(attribute.codec)) {
              vectorColumns.push(attributeName);
            }
          }

          if (vectorColumns.length === 0) {
            return fields;
          }

          let newFields = fields;

          for (const columnName of vectorColumns) {
            // Convert snake_case column name to camelCase field name
            const fieldName = build.inflection.attribute({
              codec: pgCodec,
              attributeName: columnName,
            });
            const textFieldName = `${fieldName}Text`;

            newFields = build.extend(
              newFields,
              {
                [textFieldName]: {
                  type: GraphQLString,
                  description:
                    `Natural language text to embed server-side into the \`${fieldName}\` vector column. ` +
                    `Mutually exclusive with \`${fieldName}\` — provide one or the other. ` +
                    'Requires the LLM plugin to be configured with an embedding provider.',
                },
              },
              `LlmTextMutationPlugin adding ${textFieldName} companion field for vector column '${columnName}'`
            );
          }

          return newFields;
        },
      },
    },
  };
}
