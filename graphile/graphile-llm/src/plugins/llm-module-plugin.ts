/**
 * LlmModulePlugin
 *
 * Detects and loads the `llm_module` configuration from `services_public.api_modules`.
 * Makes the resolved embedder available to other plugins via the build context.
 *
 * This plugin is the foundation that enables per-database LLM configuration.
 * When an API has an `llm_module` configured, the embedder is resolved and
 * stored on the build object for other plugins (text search, text mutations)
 * to consume.
 *
 * Resolution order for the embedder:
 *   1. `llm_module` from api_modules (per-database, loaded at schema build time)
 *   2. `defaultEmbedder` from preset options (dev/testing fallback)
 *   3. Environment variables (EMBEDDER_PROVIDER, EMBEDDER_MODEL, EMBEDDER_BASE_URL)
 *   4. null — LLM features are disabled
 *
 * Billing integration:
 *   When the billing_module is provisioned on the database, this plugin
 *   exposes metering options on the build so that text-search and
 *   text-mutation plugins can wrap embedding calls with quota checks
 *   and usage recording. The billing config is resolved lazily at
 *   request time and cached per-database (see config-cache.ts).
 */

import type { GraphileConfig } from 'graphile-config';
import { buildEmbedder, buildEmbedderFromEnv } from '../embedder';
import { buildChatCompleter, buildChatCompleterFromEnv } from '../chat';
import type { EmbedderFunction, ChatFunction, GraphileLlmOptions, MeteringConfig } from '../types';
import type { MeteringOptions } from '../metering';

// ─── TypeScript Augmentation ────────────────────────────────────────────────

declare global {
  namespace GraphileBuild {
    interface Build {
      /** The resolved embedder function, or null if LLM is not configured */
      llmEmbedder: EmbedderFunction | null;
      /** The resolved chat completion function, or null if not configured */
      llmChatCompleter: ChatFunction | null;
      /** Metering options (null if metering is explicitly disabled) */
      llmMeteringOptions: MeteringOptions | null;
      /** Whether metering is explicitly disabled via preset options */
      llmMeteringDisabled: boolean;
    }
  }
  namespace GraphileConfig {
    interface Plugins {
      LlmModulePlugin: true;
    }
  }
}

/**
 * Resolve MeteringOptions from the preset's metering config.
 */
function resolveMeteringOptions(
  metering: boolean | MeteringConfig | undefined,
): { options: MeteringOptions | null; disabled: boolean } {
  // Explicitly disabled
  if (metering === false) {
    return { options: null, disabled: true };
  }

  // Explicitly enabled with defaults
  if (metering === true || metering === undefined) {
    return { options: {}, disabled: false };
  }

  // MeteringConfig object
  return {
    options: {
      embeddingMeterSlug: metering.embeddingMeterSlug,
      chatMeterSlug: metering.chatMeterSlug,
      estimatedEmbeddingTokens: metering.estimatedEmbeddingTokens,
      skipMetering: metering.skipMetering,
    },
    disabled: false,
  };
}

/**
 * Creates the LlmModulePlugin with the given options.
 */
export function createLlmModulePlugin(
  options: GraphileLlmOptions = {}
): GraphileConfig.Plugin {
  const { defaultEmbedder, defaultChatCompleter, metering } = options;

  const { options: meteringOptions, disabled: meteringDisabled } =
    resolveMeteringOptions(metering);

  return {
    name: 'LlmModulePlugin',
    version: '0.2.0',
    description:
      'Resolves LLM embedder and chat completer configuration and makes them available to other plugins',

    schema: {
      hooks: {
        build(build) {
          // Resolve the embedder from available sources:
          // 1. Preset default embedder option
          // 2. Environment variables
          // 3. null (disabled)
          //
          // Note: Per-database llm_module resolution happens at request time,
          // not schema build time. The defaultEmbedder and env vars provide
          // the schema-build-time embedder so that text fields are registered
          // in the GraphQL schema. At execution time, the actual embedder
          // used may differ per-database based on the llm_module config.
          let embedder: EmbedderFunction | null = null;

          if (defaultEmbedder) {
            embedder = buildEmbedder(defaultEmbedder);
          }

          if (!embedder) {
            embedder = buildEmbedderFromEnv();
          }

          if (embedder) {
            console.log('[graphile-llm] Embedder configured — LLM text fields will be enabled');
          } else {
            console.log(
              '[graphile-llm] No embedder configured. Set defaultEmbedder in preset options ' +
              'or EMBEDDER_PROVIDER env var to enable text-to-vector fields.'
            );
          }

          // Resolve the chat completer from available sources
          let chat: ChatFunction | null = null;

          if (defaultChatCompleter) {
            chat = buildChatCompleter(defaultChatCompleter);
          }

          if (!chat) {
            chat = buildChatCompleterFromEnv();
          }

          if (chat) {
            console.log('[graphile-llm] Chat completer configured — RAG queries will be enabled');
          } else {
            console.log(
              '[graphile-llm] No chat completer configured. Set defaultChatCompleter in preset ' +
              'options or CHAT_PROVIDER env var to enable RAG queries.'
            );
          }

          // Log metering status
          if (meteringDisabled) {
            console.log('[graphile-llm] Metering explicitly disabled');
          } else if (meteringOptions) {
            const slug = meteringOptions.embeddingMeterSlug ?? 'embedding_tokens';
            console.log(`[graphile-llm] Metering enabled — embedding meter: ${slug}`);
          } else {
            console.log('[graphile-llm] Metering will auto-detect from billing_module');
          }

          return build.extend(build, {
            llmEmbedder: embedder,
            llmChatCompleter: chat,
            llmMeteringOptions: meteringOptions,
            llmMeteringDisabled: meteringDisabled,
          }, 'LlmModulePlugin adding llmEmbedder, llmChatCompleter, and metering options to build');
        },
      },
    },
  };
}
