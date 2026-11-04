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
 * Clients provide exactly one of `text` or `vector`; `vector` becomes optional.
 * Sending both, or neither, is an error. `unifiedSearch` text is embedded too, so pgvector
 * participates alongside the text adapters.
 *
 * The text is embedded while the operation is planned (see embed-inputs.ts),
 * before SQL is built.
 *
 * If no embedder is configured, `text` on `VectorNearbyInput` is an error and
 * `unifiedSearch` runs on the text adapters only.
 *
 * If the embedder returns null, behavior depends on `onQuotaExceeded`:
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
 * Recursively walk a `where` argument object and embed any VectorNearbyInput
 * values that have `text` instead of `vector`.
 *
 * If the embedder returns null (e.g. quota exceeded), the text field is
 * removed so the pgvector filter is skipped — graceful text-only fallback.
 *
 * @deprecated The plugins no longer call this: under Grafast a resolver runs
 * after the plan's SQL, so embedding there is too late. They embed at plan
 * time through `embedField` and `planTimeEmbedding` instead.
 */
export async function embedTextInWhere(
  obj: any,
  embedder: (text: string) => Promise<number[] | null>,
  hasTextAdapters: boolean,
  onQuotaExceeded: 'degrade' | 'throw' = 'degrade'
): Promise<void> {
  if (!obj || typeof obj !== 'object') return;

  const pending: Promise<void>[] = [];

  for (const key of Object.keys(obj)) {
    const value = obj[key];

    // Handle unifiedSearch: embed text and transform to { __text, __vector }
    if (key === 'unifiedSearch' && typeof value === 'string' && value.trim().length > 0) {
      pending.push((async () => {
        const startTime = Date.now();
        const vector = await embedder(value);
        const latencyMs = Date.now() - startTime;

        if (vector === null) {
          if (onQuotaExceeded === 'throw' || !hasTextAdapters) {
            throw new Error(
              'unifiedSearch: embedding failed (quota exceeded or provider unavailable). ' +
              (!hasTextAdapters
                ? 'No text search adapters available for fallback. '
                : 'onQuotaExceeded is set to \'throw\'. ') +
              'Upgrade your plan or adjust onQuotaExceeded to \'degrade\' for text-only fallback.'
            );
          }
          return;
        }

        console.log(
          `[graphile-llm] unifiedSearch embed: dims=${vector.length}, latency=${latencyMs}ms`
        );

        // Transform to object shape that graphile-search understands
        obj[key] = { __text: value, __vector: vector };
      })());
      continue;
    }

    if (!value || typeof value !== 'object') continue;

    // Detect VectorNearbyInput shape: has `text` and no `vector`
    if ('text' in value && typeof value.text === 'string' && !value.vector) {
      pending.push((async () => {
        const startTime = Date.now();
        const vector = await embedder(value.text);
        const latencyMs = Date.now() - startTime;

        if (vector === null) {
          if (onQuotaExceeded === 'throw') {
            throw new Error(
              'VectorNearbyInput: embedding failed (quota exceeded or provider unavailable). ' +
              'Upgrade your plan or adjust onQuotaExceeded to \'degrade\' for graceful fallback.'
            );
          }
          delete value.text;
          return;
        }

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
      pending.push(embedTextInWhere(value, embedder, hasTextAdapters, onQuotaExceeded));
    } else {
      // Handle arrays (e.g. AND: [...], OR: [...])
      for (const item of value) {
        pending.push(embedTextInWhere(item, embedder, hasTextAdapters, onQuotaExceeded));
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
                    'Provide exactly one of `text` or `vector`; sending both or neither is an error. ' +
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
              '[graphile-llm] No embedder available — text on VectorNearbyInput is rejected ' +
              'and unifiedSearch runs without pgvector. Configure an embedding provider to enable.'
            );
          }
          return planTimeEmbedding(schema, build);
        }
      }
    }
  };
}
