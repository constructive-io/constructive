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
 * Collect the text→vector field mapping for a codec's vector columns.
 * Returns a map of textFieldName → vectorFieldName.
 */
function getTextToVectorMapping(
  pgCodec: any,
  build: any,
): Record<string, string> {
  const mapping: Record<string, string> = {};
  if (!pgCodec?.attributes) return mapping;

  for (const [attributeName, attribute] of Object.entries(
    pgCodec.attributes as Record<string, any>
  )) {
    if (isVectorCodec(attribute.codec)) {
      const fieldName = build.inflection.attribute({
        codec: pgCodec,
        attributeName,
      });
      mapping[`${fieldName}Text`] = fieldName;
    }
  }
  return mapping;
}

/**
 * Creates the LlmTextMutationPlugin.
 *
 * Hooks into GraphQLInputObjectType_fields for create/update input types
 * and adds `{columnName}Text: String` for each vector column.
 *
 * Also wraps mutation resolvers via GraphQLObjectType_fields_field to
 * intercept `*Text` companion field values, embed them, and inject the
 * resulting vectors before the mutation executes.
 */
export function createLlmTextMutationPlugin(): GraphileConfig.Plugin {
  return {
    name: 'LlmTextMutationPlugin',
    version: '0.2.0',
    description:
      'Adds text companion fields on mutation inputs for vector columns — ' +
      'text is embedded server-side before storing',
    after: [
      'LlmModulePlugin',
      'PgAttributesPlugin',
      'PgMutationCreatePlugin',
      'PgMutationUpdateDeletePlugin',
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

          if (!pgCodec?.attributes || (!isPgPatch && !isPgBaseInput && !isMutationInput)) {
            return fields;
          }

          const {
            graphql: { GraphQLString },
          } = build;

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

        /**
         * Wrap create/update mutation resolvers to intercept `*Text` companion
         * field values, embed them using the configured embedder, and inject
         * the resulting vector into the corresponding vector field.
         *
         * If the embedder returns null (e.g. quota exceeded), throws an error.
         */
        GraphQLObjectType_fields_field(field, build, context) {
          const {
            scope: { isRootMutation, fieldName, pgCodec },
          } = context as any;

          if (!isRootMutation || !pgCodec || !pgCodec.attributes) {
            return field;
          }

          const isCreate = fieldName.startsWith('create');
          const isUpdate = fieldName.startsWith('update');
          if (!isCreate && !isUpdate) {
            return field;
          }

          const textToVectorMap = getTextToVectorMapping(pgCodec, build);
          if (Object.keys(textToVectorMap).length === 0) {
            return field;
          }

          const embedder = (build as any).llmEmbedder as
            | ((text: string) => Promise<number[] | null>)
            | null;

          const defaultResolver = (obj: any) => obj[fieldName];
          const { resolve: oldResolve = defaultResolver, ...rest } = field;

          return {
            ...rest,
            async resolve(source: any, args: any, graphqlContext: any, info: any) {
              async function embedTextFields(obj: any): Promise<void> {
                if (!obj || typeof obj !== 'object') return;

                const pending: Promise<void>[] = [];

                for (const key of Object.keys(obj)) {
                  const value = obj[key];

                  if (key in textToVectorMap && typeof value === 'string') {
                    const vectorFieldName = textToVectorMap[key];

                    pending.push((async () => {
                      if (!embedder) {
                        throw new Error(
                          `EMBED_NOT_CONFIGURED: Cannot embed ${key} — no embedding provider configured. ` +
                          'Set defaultEmbedder in GraphileLlmPreset options or EMBEDDER_PROVIDER env var.'
                        );
                      }

                      const vector = await embedder(value);

                      if (vector === null) {
                        throw new Error(
                          `EMBED_QUOTA_EXCEEDED: Cannot embed ${key} — embedding quota exceeded. ` +
                          'Upgrade your plan or wait for the next billing period.'
                        );
                      }

                      console.log(
                        `[graphile-llm] Mutation embed: field=${key}, dims=${vector.length}`
                      );

                      obj[vectorFieldName] = vector;
                      delete obj[key];
                    })());
                    continue;
                  }

                  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    pending.push(embedTextFields(value));
                  }
                }

                if (pending.length > 0) {
                  await Promise.all(pending);
                }
              }

              await embedTextFields(args);
              return oldResolve(source, args, graphqlContext, info);
            },
          };
        },
      },
    },
  };
}
