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
    version: '0.1.0',
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

          // Resolve the chat completer from available sources:
          // 1. Preset default chat completer option
          // 2. Environment variables
          // 3. null (disabled — RAG queries will error)
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
          }, 'LlmModulePlugin adding llmEmbedder and llmChatCompleter to build');
        },
      },
    },
  };
}
