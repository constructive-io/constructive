/**
 * LlmModulePlugin
 *
 * Detects and loads the `llm_module` configuration from `services_public.api_modules`.
 * Makes the resolved embedder and chat completer available to other plugins
 * via the build context.
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
 * This plugin is intentionally pure — no billing or metering logic.
 * The optional LlmMeteringPlugin wraps the embedder with billing integration
 * if loaded (it runs after this plugin and before the consumer plugins).
 */

import type { GraphileConfig } from 'graphile-config';
import { buildEmbedder, buildEmbedderFromEnv } from '../embedder';
import { buildChatCompleter, buildChatCompleterFromEnv } from '../chat';
import type { EmbedderFunction, ChatFunction, GraphileLlmOptions } from '../types';

// ─── TypeScript Augmentation ────────────────────────────────────────────────

declare global {
  namespace GraphileBuild {
    interface Build {
      /** The resolved embedder function, or null if LLM is not configured */
      llmEmbedder: EmbedderFunction | null;
      /** The resolved chat completion function, or null if not configured */
      llmChatCompleter: ChatFunction | null;
      /** The embedding model name (used as billing meter slug) */
      llmEmbeddingModel: string | null;
      /** The chat model name (used as billing meter slug) */
      llmChatModel: string | null;
    }
  }
  namespace GraphileConfig {
    interface Plugins {
      LlmModulePlugin: true;
    }
  }
}

/**
 * Creates the LlmModulePlugin with the given options.
 */
export function createLlmModulePlugin(
  options: GraphileLlmOptions = {}
): GraphileConfig.Plugin {
  const { defaultEmbedder, defaultChatCompleter } = options;

  return {
    name: 'LlmModulePlugin',
    version: '0.2.0',
    description:
      'Resolves LLM embedder and chat completer configuration and makes them available to other plugins',

    schema: {
      hooks: {
        build(build) {
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

          return build.extend(build, {
            llmEmbedder: embedder,
            llmChatCompleter: chat,
            llmEmbeddingModel: defaultEmbedder?.model ?? process.env.EMBEDDER_MODEL ?? null,
            llmChatModel: defaultChatCompleter?.model ?? process.env.CHAT_MODEL ?? null,
          }, 'LlmModulePlugin adding llmEmbedder, llmChatCompleter, and model names to build');
        },
      },
    },
  };
}
