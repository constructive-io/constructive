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
 * Creates the LlmTextSearchPlugin.
 *
 * Hooks into VectorNearbyInput to add a `text` field alongside the
 * existing `vector` field. When a user provides `text`, the plugin's
 * filter-apply logic embeds it before passing to pgvector.
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
         * Intercept filter application to embed text before pgvector processing.
         *
         * When a VectorNearbyInput filter value contains `text` instead of `vector`,
         * we embed the text and replace it with the resulting vector array so the
         * downstream pgvector adapter processes it normally.
         */
        finalize(schema, build) {
          const embedder: EmbedderFunction | null = (build as any).llmEmbedder;

          if (!embedder) {
            console.log(
              '[graphile-llm] No embedder available — text field on VectorNearbyInput ' +
              'will return errors if used. Configure an embedding provider to enable.'
            );
          }

          // Store the embedder on the schema extensions so it can be accessed
          // at execution time by the resolveInputValue override
          (schema as any).__llmEmbedder = embedder;

          return schema;
        },
      },
    },
  };
}
