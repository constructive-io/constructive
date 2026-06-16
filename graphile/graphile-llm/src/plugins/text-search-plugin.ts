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
 *
 * If the embedder returns null (e.g. quota exceeded when the metering
 * plugin is loaded), behavior depends on `onQuotaExceeded`:
 * - `'degrade'` (default): silently removes the text field and continues
 *   with text-only search as a graceful fallback.
 * - `'throw'`: always throws an error, even if text adapters could handle it.
 */

import type { GraphileConfig } from 'graphile-config';

import { llmConfigStore } from '../embedder';
import type { LlmConfigOverrides } from '../embedder';

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
 *
 * If the embedder returns null (e.g. quota exceeded), the text field is
 * removed so the pgvector filter is skipped — graceful text-only fallback.
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

/** Embedder signature expected by embedTextInWhere */
type WhereEmbedder = (text: string) => Promise<number[] | null>;

/**
 * Resolve per-DB LLM config overrides from express-context.
 * Returns an LlmConfigOverrides object if per-DB config is available,
 * or null to use defaults. These overrides are string parameters only
 * (model name, base URL) — the embedder function and its metering
 * wrapper stay the same.
 */
async function resolveConfigOverrides(
  graphqlContext: any
): Promise<LlmConfigOverrides | null> {
  const ctx = graphqlContext?.constructive;
  if (!ctx?.useLlm) return null;

  try {
    const llm = await ctx.useLlm();
    if (!llm?.embeddingModel) return null;

    return {
      embeddingModel: llm.embeddingModel,
      embeddingBaseUrl: llm.embeddingBaseUrl,
      chatModel: llm.chatModel ?? undefined,
      chatBaseUrl: llm.chatBaseUrl ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Creates the LlmTextSearchPlugin.
 *
 * Hooks into VectorNearbyInput to add a `text` field alongside the
 * existing `vector` field. When a user provides `text`, the plugin's
 * resolver wrapper embeds it before passing to pgvector.
 */
export function createLlmTextSearchPlugin(
  options: { onQuotaExceeded?: 'degrade' | 'throw' } = {}
): GraphileConfig.Plugin {
  const { onQuotaExceeded = 'degrade' } = options;
  return {
    name: 'LlmTextSearchPlugin',
    version: '0.2.0',
    description:
      'Adds text-to-vector embedding support on VectorNearbyInput filter fields',
    after: [
      'LlmModulePlugin',
      'UnifiedSearchPlugin',
      'VectorCodecPlugin'
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
          const typeName = context.Self.name;

          if (typeName !== 'VectorNearbyInput') {
            return fields;
          }

          const {
            graphql: { GraphQLString }
          } = build;

          return build.extend(
            fields,
            {
              text: {
                type: GraphQLString,
                description:
                  'Natural language text to embed server-side for similarity search. ' +
                  'Mutually exclusive with `vector` — provide one or the other. ' +
                  'Requires the LLM plugin to be configured with an embedding provider.'
              }
            },
            'LlmTextSearchPlugin adding text field to VectorNearbyInput'
          );
        },

        /**
         * Wrap connection query resolvers to intercept `where` arguments that
         * contain VectorNearbyInput with `text` or `unifiedSearch` with text,
         * embed the text, and inject the resulting vector before the plan executes.
         *
         * For tables with vector columns: embeds VectorNearbyInput.text → vector
         * For ALL tables with unifiedSearch: embeds unifiedSearch text → { __text, __vector }
         *
         * Uses the same v4-style resolver wrapping pattern as graphile-upload-plugin
         * and graphile-bucket-provisioner-plugin.
         */
        GraphQLObjectType_fields_field(field, build, context) {
          const {
            scope: { isRootQuery, pgCodec }
          } = context as any;

          if (!isRootQuery || !pgCodec) return field;

          // Wrap if the table has vector columns OR has any searchable columns
          // (for unifiedSearch embedding support)
          const hasVector = hasVectorColumns(pgCodec);
          const hasSearchableColumns = pgCodec.attributes && Object.values(
            pgCodec.attributes as Record<string, any>
          ).some((attr: any) =>
            attr.codec?.name === 'tsvector' || attr.codec?.name === 'vector'
          );

          if (!hasVector && !hasSearchableColumns) return field;

          const embedder = (build as any).llmEmbedder as
            | WhereEmbedder
            | null;
          if (!embedder) return field;

          // Determine if this table has text-based search adapters for fallback logic
          const hasTextAdapters = pgCodec.attributes && Object.values(
            pgCodec.attributes as Record<string, any>
          ).some((attr: any) => attr.codec?.name === 'tsvector');

          const defaultResolver = (obj: any) => obj[context.scope.fieldName];
          const { resolve: oldResolve = defaultResolver, ...rest } = field;

          return {
            ...rest,
            async resolve(source: any, args: any, graphqlContext: any, info: any) {
              // Resolve per-DB model/baseUrl overrides from express-context.
              // These are just string parameters — the embedder function
              // (and its metering wrapper) stays the same.
              const overrides = await resolveConfigOverrides(graphqlContext);

              // Run within llmConfigStore so the embedder picks up per-DB
              // model/baseUrl at call time. Metering wraps the same function
              // and is unaffected.
              return llmConfigStore.run(overrides, async () => {
                if (args?.where) {
                  await embedTextInWhere(args.where, embedder, !!hasTextAdapters, onQuotaExceeded);
                }

                if (args?.filter) {
                  await embedTextInWhere(args.filter, embedder, !!hasTextAdapters, onQuotaExceeded);
                }

                return oldResolve(source, args, graphqlContext, info);
              });
            }
          };
        },

        finalize(schema, build) {
          const embedder = (build as any).llmEmbedder;

          if (!embedder) {
            console.log(
              '[graphile-llm] No embedder available — text field on VectorNearbyInput ' +
              'will return errors if used. Configure an embedding provider to enable.'
            );
          }

          return schema;
        }
      }
    }
  };
}
