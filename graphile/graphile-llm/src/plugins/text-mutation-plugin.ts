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
 * If the embedder returns null (e.g. quota exceeded when the metering plugin
 * is loaded), the mutation throws an error — unlike search, mutations cannot
 * silently skip writing a vector the user asked for.
 *
 * This is the mutation counterpart to LlmTextSearchPlugin (which handles
 * filter/query-side text-to-vector). Together they let clients work entirely
 * with text/prompts instead of raw float vectors.
 *
 * The text is embedded while the mutation is planned (see embed-inputs.ts),
 * before the INSERT/UPDATE is built. On a create input for a NOT NULL vector
 * column the vector field becomes optional, and one of `{col}` or `{col}Text`
 * is required at execution time. If both are given, the vector is used.
 *
 * The companion fields are only added when the LLM plugin is loaded.
 * If no embedder is configured, the fields are still registered for schema
 * stability but return a clear error at execution time.
 */

import 'graphile-build';
import 'graphile-build-pg';

import type { GraphileConfig } from 'graphile-config';

import { embedField, planTimeEmbedding } from '../embed-inputs';

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
 * and adds `{columnName}Text: String` for each vector column, tagged for
 * plan-time embedding.
 */
export function createLlmTextMutationPlugin(): GraphileConfig.Plugin {
  return {
    name: 'LlmTextMutationPlugin',
    version: '0.3.0',
    description:
      'Adds text companion fields on mutation inputs for vector columns — ' +
      'text is embedded server-side before storing',
    after: [
      'LlmModulePlugin',
      'PgAttributesPlugin',
      'PgMutationCreatePlugin',
      'PgMutationUpdateDeletePlugin',
      'VectorCodecPlugin'
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
              pgCodec
            }
          } = context as any;

          // Only intercept mutation-related input types for table rows.
          // PostGraphile v5 sets isPgPatch on update types, isPgBaseInput on
          // create base types. For tables with `serial PRIMARY KEY`, the create
          // input type (e.g. ArticleInput) has pgCodec set but none of the
          // explicit mutation scope flags — detect via type name convention.
          if (!pgCodec?.attributes) return fields;

          const typeName = context.Self.name;
          const hasExplicitMutationScope = isPgPatch || isPgBaseInput || isMutationInput;
          const looksLikeMutationInput = typeName.endsWith('Input') || typeName.endsWith('Patch');
          const isFilterOrCondition = typeName.endsWith('FilterInput')
            || typeName.endsWith('Filter')
            || typeName.endsWith('Condition')
            || typeName === 'VectorNearbyInput';

          if (!hasExplicitMutationScope && (!looksLikeMutationInput || isFilterOrCondition)) {
            return fields;
          }

          const {
            graphql: { GraphQLString, getNullableType, isNonNullType }
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
              attributeName: columnName
            });
            const textFieldName = `${fieldName}Text`;

            // Skip when the input type already has a field with the companion
            // name (e.g. a physical `embedding_text` column inflected to
            // `embeddingText`) — extending would be a naming conflict.
            if (textFieldName in newFields) {
              continue;
            }

            const vectorField = newFields[fieldName];
            const required = !!vectorField && isNonNullType(vectorField.type);
            if (required) {
              newFields = {
                ...newFields,
                [fieldName]: { ...vectorField, type: getNullableType(vectorField.type) as any }
              };
            }

            newFields = build.extend(
              newFields,
              {
                [textFieldName]: embedField(
                  { kind: 'companion', into: fieldName, required },
                  {
                    type: GraphQLString,
                    description:
                      `Natural language text to embed server-side into the \`${fieldName}\` vector column. ` +
                      `Provide \`${fieldName}\` or \`${textFieldName}\`; if both are given, \`${fieldName}\` is used. ` +
                      'Requires the LLM plugin to be configured with an embedding provider.'
                  }
                )
              },
              `LlmTextMutationPlugin adding ${textFieldName} companion field for vector column '${columnName}'`
            );
          }

          return newFields;
        },

        finalize(schema, build) {
          return planTimeEmbedding(schema, build);
        }
      }
    }
  };
}
