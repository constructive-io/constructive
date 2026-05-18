/**
 * LlmTextSearchPlugin
 *
 * Adds a `text: String` field to `VectorNearbyInput` when the LLM plugin
 * is enabled. This allows clients to pass natural language text instead of
 * raw float vectors for similarity search — the plugin converts text to
 * vectors server-side using the configured embedder.
 *
 * Billing integration:
 *   When billing_module is provisioned and metering is not disabled,
 *   embedding calls are wrapped with:
 *     1. check_billing_quota() — pre-check before the API call
 *     2. record_usage() — post-record with token count + latency
 *   When quota is exceeded, the vector path is skipped entirely
 *   (graceful degradation to text-only search).
 *
 * The `text` field is mutually exclusive with `vector`: clients provide
 * one or the other. When `text` is provided, the plugin embeds it and
 * injects the resulting vector into the normal pgvector pipeline.
 */

import type { GraphileConfig } from 'graphile-config';
import type { EmbedderFunction } from '../types';
import type { MeteringOptions, MeteringContext, WithPgClient } from '../metering';
import { meteredEmbed } from '../metering';
import { getLlmBillingConfig } from '../config-cache';
import type { PgClient } from '../config-cache';

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
 * Build a MeteringContext from the GraphQL context, if billing is available.
 *
 * Resolves billing config (cached per database_id) and assembles a context
 * that the metering functions can use to check quota and record usage.
 */
async function buildMeteringContext(
  graphqlContext: any,
  meteringOptions: MeteringOptions | null,
  meteringDisabled: boolean,
): Promise<MeteringContext | null> {
  if (meteringDisabled || !meteringOptions) return null;
  if (meteringOptions.skipMetering) return null;

  const pgSettings: Record<string, string> = graphqlContext?.pgSettings ?? {};
  const entityId = pgSettings['jwt.claims.membership_id']
    ?? pgSettings['jwt.claims.user_id']
    ?? null;
  const databaseId = pgSettings['jwt.claims.database_id'] ?? null;
  if (!entityId || !databaseId) return null;

  const withPgClient: WithPgClient | undefined = graphqlContext?.withPgClient;
  if (!withPgClient) return null;

  // Resolve billing config (cached per database_id)
  let billingConfig = null;
  try {
    await withPgClient(pgSettings, async (pgClient: PgClient) => {
      const entry = await getLlmBillingConfig(pgClient, databaseId);
      billingConfig = entry.billing;
    });
  } catch {
    return null;
  }

  if (!billingConfig) return null;

  return {
    withPgClient,
    pgSettings,
    billing: billingConfig,
    entityId,
  };
}

/**
 * Recursively walk a `where` argument object and embed any VectorNearbyInput
 * values that have `text` instead of `vector`.
 *
 * When metering is active, uses meteredEmbed which checks quota first.
 * If quota is exceeded, the text field is simply removed (no vector injected),
 * causing the pgvector filter to be skipped — graceful text-only degradation.
 */
async function embedTextInWhere(
  obj: any,
  embedder: EmbedderFunction,
  meteringCtx: MeteringContext | null,
  meteringOptions: MeteringOptions,
): Promise<void> {
  if (!obj || typeof obj !== 'object') return;

  const pending: Promise<void>[] = [];

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (!value || typeof value !== 'object') continue;

    // Detect VectorNearbyInput shape: has `text` and no `vector`
    if ('text' in value && typeof value.text === 'string' && !value.vector) {
      pending.push((async () => {
        const meterResult = await meteredEmbed(
          embedder,
          value.text,
          meteringCtx,
          meteringOptions,
        );

        if (meterResult.quotaExceeded) {
          // Graceful degradation: remove the text field entirely
          // so pgvector is not invoked — text-only search continues
          delete value.text;
          return;
        }

        if (meterResult.result) {
          console.log(
            `[graphile-llm] Search embed: field=${key}, dims=${meterResult.result.length}, ` +
            `latency=${meterResult.latencyMs}ms, metered=${meterResult.metered}`
          );

          // Replace text with vector
          value.vector = meterResult.result;
          delete value.text;
        }
      })());
      continue;
    }

    // Recurse into nested filter objects (AND, OR, etc.)
    if (!Array.isArray(value)) {
      pending.push(embedTextInWhere(value, embedder, meteringCtx, meteringOptions));
    } else {
      for (const item of value) {
        pending.push(embedTextInWhere(item, embedder, meteringCtx, meteringOptions));
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
    version: '0.2.0',
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
         * When metering is active, checks billing quota before embedding.
         * On quota exceeded, the vector is not injected (text-only fallback).
         */
        GraphQLObjectType_fields_field(field, build, context) {
          const {
            scope: { isRootQuery, pgCodec },
          } = context as any;

          if (!isRootQuery || !pgCodec || !hasVectorColumns(pgCodec)) {
            return field;
          }

          const embedder: EmbedderFunction | null = (build as any).llmEmbedder;
          if (!embedder) return field;

          const meteringOptions: MeteringOptions | null = (build as any).llmMeteringOptions;
          const meteringDisabled: boolean = (build as any).llmMeteringDisabled ?? false;

          const defaultResolver = (obj: any) => obj[context.scope.fieldName];
          const { resolve: oldResolve = defaultResolver, ...rest } = field;

          return {
            ...rest,
            async resolve(source: any, args: any, graphqlContext: any, info: any) {
              // Build metering context if billing is available
              const meteringCtx = await buildMeteringContext(
                graphqlContext,
                meteringOptions,
                meteringDisabled,
              );

              const resolvedMeteringOptions = meteringOptions ?? {};

              // If the query has a `where` argument, check for text fields
              if (args?.where) {
                await embedTextInWhere(args.where, embedder, meteringCtx, resolvedMeteringOptions);
              }

              // Also handle `filter` for relay-style connections
              if (args?.filter) {
                await embedTextInWhere(args.filter, embedder, meteringCtx, resolvedMeteringOptions);
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
