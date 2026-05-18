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
 * Billing integration:
 *   When billing_module is provisioned and metering is not disabled,
 *   embedding calls are wrapped with quota checks and usage recording.
 *   Unlike search (which gracefully degrades), mutations THROW on quota
 *   exceeded — you can't silently skip writing a vector the user asked for.
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
import type { MeteringOptions, MeteringContext, WithPgClient } from '../metering';
import { meteredEmbed, QuotaExceededError } from '../metering';
import { getLlmBillingConfig } from '../config-cache';
import type { PgClient } from '../config-cache';

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
 * Build a MeteringContext from the GraphQL context, if billing is available.
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
         * When metering is active, checks billing quota before embedding.
         * Unlike search, mutations throw on quota exceeded.
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

          const embedder: EmbedderFunction | null = (build as any).llmEmbedder;
          const meteringOptions: MeteringOptions | null = (build as any).llmMeteringOptions;
          const meteringDisabled: boolean = (build as any).llmMeteringDisabled ?? false;

          const defaultResolver = (obj: any) => obj[fieldName];
          const { resolve: oldResolve = defaultResolver, ...rest } = field;

          return {
            ...rest,
            async resolve(source: any, args: any, graphqlContext: any, info: any) {
              const meteringCtx = await buildMeteringContext(
                graphqlContext,
                meteringOptions,
                meteringDisabled,
              );
              const resolvedMeteringOptions = meteringOptions ?? {};

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

                      const meterResult = await meteredEmbed(
                        embedder,
                        value,
                        meteringCtx,
                        resolvedMeteringOptions,
                      );

                      if (meterResult.quotaExceeded) {
                        throw new QuotaExceededError(
                          resolvedMeteringOptions.embeddingMeterSlug ?? 'embedding_tokens',
                          meteringCtx?.entityId ?? 'unknown',
                        );
                      }

                      if (meterResult.result) {
                        console.log(
                          `[graphile-llm] Mutation embed: field=${key}, dims=${meterResult.result.length}, ` +
                          `latency=${meterResult.latencyMs}ms, metered=${meterResult.metered}`
                        );

                        obj[vectorFieldName] = meterResult.result;
                        delete obj[key];
                      }
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
