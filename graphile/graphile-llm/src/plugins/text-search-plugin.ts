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
 * Clients provide `text` or `vector`; `vector` becomes optional. When both
 * are given the vector wins. `unifiedSearch` text is embedded too, so pgvector
 * participates alongside the text adapters.
 *
 * The text is embedded while the operation is planned (see embed-inputs.ts),
 * before SQL is built.
 *
 * If no embedder is configured, `text` is ignored and `unifiedSearch` runs
 * on the text adapters only.
 *
 * If the embedder returns null (e.g. quota exceeded when the metering
 * plugin is loaded), behavior depends on `onQuotaExceeded`:
 * - `'degrade'` (default): drops the text and continues without the vector
 *   filter (text-only search for `unifiedSearch`).
 * - `'throw'`: throws an error.
 */

import type { GraphileConfig } from 'graphile-config';

import { embedField, planTimeEmbedding } from '../embed-inputs';

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
 * existing `vector` field, and tags `text` and `unifiedSearch` for
 * plan-time embedding.
 */
export function createLlmTextSearchPlugin(
  options: { onQuotaExceeded?: 'degrade' | 'throw' } = {}
): GraphileConfig.Plugin {
  const { onQuotaExceeded = 'degrade' } = options;
  return {
    name: 'LlmTextSearchPlugin',
    version: '0.3.0',
    description:
      'Adds text-to-vector embedding support on VectorNearbyInput filter fields',
    after: [
      'LlmModulePlugin',
      'UnifiedSearchPlugin',
      'VectorCodecPlugin'
    ],

    schema: {
      hooks: {
        GraphQLInputObjectType_fields(fields, build, context) {
          if (context.Self.name !== 'VectorNearbyInput') {
            return fields;
          }

          const {
            graphql: { GraphQLString, getNullableType }
          } = build;

          return build.extend(
            {
              ...fields,
              ...(fields.vector && {
                vector: { ...fields.vector, type: getNullableType(fields.vector.type) as any }
              })
            },
            {
              text: embedField(
                { kind: 'nearby', into: 'vector', onQuotaExceeded },
                {
                  type: GraphQLString,
                  description:
                    'Natural language text to embed server-side for similarity search. ' +
                    'Provide `text` or `vector`; if both are given, `vector` is used. ' +
                    'Requires the LLM plugin to be configured with an embedding provider.'
                }
              )
            },
            'LlmTextSearchPlugin adding text field to VectorNearbyInput'
          );
        },

        GraphQLInputObjectType_fields_field(field, _build, context) {
          const { fieldName, isPgConnectionFilterField } = context.scope as any;
          if (fieldName !== 'unifiedSearch' || !isPgConnectionFilterField) return field;
          return embedField({ kind: 'unified', onQuotaExceeded }, field);
        },

        finalize(schema, build) {
          if (!(build as any).llmEmbedder) {
            console.log(
              '[graphile-llm] No embedder available — text on VectorNearbyInput is ignored ' +
              'and unifiedSearch runs without pgvector. Configure an embedding provider to enable.'
            );
          }
          return planTimeEmbedding(schema, build);
        }
      }
    }
  };
}
