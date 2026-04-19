/**
 * LlmTextSearchPlugin
 *
 * Adds a `text: String` field to `VectorNearbyInput` when the LLM plugin
 * is enabled. This allows clients to pass natural language text instead of
 * raw float vectors for similarity search — the plugin converts text to
 * vectors server-side using the configured embedder.
 *
 * This mirrors the graphile-postgis pattern where `WithinDistanceInput`
 * accepts a compound input (point + distance) and the plugin handles
 * the conversion to SQL internally.
 *
 * The `text` field is mutually exclusive with `vector`: clients provide
 * one or the other. When `text` is provided, the plugin embeds it and
 * injects the resulting vector into the normal pgvector pipeline.
 *
 * Runtime embedding for query filters uses the v4-style resolver wrapping
 * approach (same as graphile-upload-plugin). When a connection query's
 * `where` argument includes a VectorNearbyInput with `text`, the resolver
 * wrapper embeds the text and replaces it with the resulting vector before
 * the plan executes.
 *
 * If the embedder is not configured, the `text` field is still registered
 * (so the schema is stable) but will return a clear error at execution time.
 */

import type { GraphileConfig } from 'graphile-config';
import type { EmbedderFunction } from '../types';

// ─── TypeScript Augmentation ────────────────────────────────────────────────

declare global {
  namespace GraphileConfig {
    interface Plugins {
      LlmTextSearchPlugin: true;
    }
  }
}

/**
 * Check if a codec has any pgvector `vector` columns.
 */
function hasVectorColumns(pgCodec: any): boolean {
  if (!pgCodec?.attributes) return false;
  for (const attribute of Object.values(pgCodec.attributes as Record<string, any>)) {
    if (attribute.codec?.name === 'vector') return true;
  }
  return false;
}

/**
 * Recursively walk a `where` argument object and embed any VectorNearbyInput
 * values that have `text` instead of `vector`.
 */
async function embedTextInWhere(
  obj: any,
  embedder: EmbedderFunction,
): Promise<void> {
  if (!obj || typeof obj !== 'object') return;

  const pending: Promise<void>[] = [];

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (!value || typeof value !== 'object') continue;

    // Detect VectorNearbyInput shape: has `text` and no `vector`
    if ('text' in value && typeof value.text === 'string' && !value.vector) {
      pending.push((async () => {
        const startTime = Date.now();
        const vector = await embedder(value.text);
        const latencyMs = Date.now() - startTime;

        console.log(
          `[graphile-llm] Search embed: field=${key}, dims=${vector.length}, latency=${latencyMs}ms`
        );

        // Replace text with vector
        value.vector = vector;
        delete value.text;
      })());
      continue;
    }

    // Recurse into nested filter objects (AND, OR, etc.)
    if (!Array.isArray(value)) {
      pending.push(embedTextInWhere(value, embedder));
    } else {
      // Handle arrays (e.g. AND: [...], OR: [...])
      for (const item of value) {
        pending.push(embedTextInWhere(item, embedder));
      }
    }
  }

  if (pending.length > 0) {
    await Promise.all(pending);
  }
}

/**
 * Creates the LlmTextSearchPlugin.
 *
 * Hooks into VectorNearbyInput to add a `text` field alongside the
 * existing `vector` field. When a user provides `text`, the plugin's
 * resolver wrapper embeds it before passing to pgvector.
 */
export function createLlmTextSearchPlugin(): GraphileConfig.Plugin {
  return {
    name: 'LlmTextSearchPlugin',
    version: '0.1.0',
    description:
      'Adds text-to-vector embedding support on VectorNearbyInput filter fields',
    after: [
      'LlmModulePlugin',
      'UnifiedSearchPlugin',
      'VectorCodecPlugin',
    ],

    schema: {
      hooks: {
        /**
         * Add the `text: String` field to VectorNearbyInput.
         *
         * We intercept VectorNearbyInput specifically and add a `text` field.
         * The field is optional — clients provide either `text` or `vector`.
         */
        GraphQLInputObjectType_fields(fields, build, context) {
          const {
            scope: { inputObjectTypeName },
          } = context as any;

          if (inputObjectTypeName !== 'VectorNearbyInput') {
            return fields;
          }

          const {
            graphql: { GraphQLString },
          } = build;

          return build.extend(
            fields,
            {
              text: {
                type: GraphQLString,
                description:
                  'Natural language text to embed server-side for similarity search. ' +
                  'Mutually exclusive with `vector` — provide one or the other. ' +
                  'Requires the LLM plugin to be configured with an embedding provider.',
              },
            },
            'LlmTextSearchPlugin adding text field to VectorNearbyInput'
          );
        },

        /**
         * Wrap connection query resolvers to intercept `where` arguments that
         * contain VectorNearbyInput with `text`, embed the text, and replace
         * it with the resulting vector before the plan executes.
         *
         * Uses the same v4-style resolver wrapping pattern as graphile-upload-plugin
         * and graphile-bucket-provisioner-plugin.
         */
        GraphQLObjectType_fields_field(field, build, context) {
          const {
            scope: { isRootQuery, pgCodec },
          } = context as any;

          // Only wrap root query fields on tables with vector columns
          if (!isRootQuery || !pgCodec || !hasVectorColumns(pgCodec)) {
            return field;
          }

          const embedder: EmbedderFunction | null = (build as any).llmEmbedder;
          if (!embedder) return field;

          const defaultResolver = (obj: any) => obj[context.scope.fieldName];
          const { resolve: oldResolve = defaultResolver, ...rest } = field;

          return {
            ...rest,
            async resolve(source: any, args: any, graphqlContext: any, info: any) {
              // If the query has a `where` argument, check for text fields
              if (args?.where) {
                await embedTextInWhere(args.where, embedder);
              }

              // Also handle `filter` for relay-style connections
              if (args?.filter) {
                await embedTextInWhere(args.filter, embedder);
              }

              return oldResolve(source, args, graphqlContext, info);
            },
          };
        },

        finalize(schema, build) {
          const embedder: EmbedderFunction | null = (build as any).llmEmbedder;

          if (!embedder) {
            console.log(
              '[graphile-llm] No embedder available — text field on VectorNearbyInput ' +
              'will return errors if used. Configure an embedding provider to enable.'
            );
          }

          return schema;
        },
      },
    },
  };
}
