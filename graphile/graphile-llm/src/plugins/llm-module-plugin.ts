/**
 * LlmModulePlugin
 *
 * Detects and loads the `llm_module` configuration from `metaschema_modules_public.llm_module`.
 * Makes the resolved embedder and chat completer available to other plugins
 * via the build context.
 *
 * This plugin is the foundation that enables per-database LLM configuration.
 * When an API has an `llm_module` configured, the embedder is resolved and
 * stored on the build object for other plugins (text search, text mutations)
 * to consume.
 *
 * Resolution order for the embedder:
 *   1. `defaultEmbedder` from preset options (build-time)
 *   2. Environment variables (EMBEDDER_PROVIDER, EMBEDDER_MODEL)
 *   3. null — LLM features are disabled
 *
 * Per-database model overrides (from `llm_module` via `ctx.useLlm()`)
 * are applied at request time via `llmConfigStore` (AsyncLocalStorage) in
 * the plan-time embedding step (embed-inputs.ts). The same embedder function
 * handles every request; only the model name and base URL parameters change
 * per-tenant.
 */

import type { GraphileConfig } from 'graphile-config';

import { buildChatCompleter, buildChatCompleterFromEnv } from '../chat';
import { buildEmbedder, buildEmbedderFromEnv } from '../embedder';
import { getLlmEnvOptions } from '../env';
import type { ChatFunction, EmbedderFunction, GraphileLlmOptions } from '../types';

// ─── TypeScript Augmentation ────────────────────────────────────────────────

declare global {
  namespace GraphileBuild {
    interface Build {
      /** The resolved embedder function, or null if LLM is not configured */
      llmEmbedder: EmbedderFunction | null;
      /** The resolved chat completion function, or null if not configured */
      llmChatCompleter: ChatFunction | null;
      /** The embedding model name */
      llmEmbeddingModel: string | null;
      /** The chat model name */
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
              '[graphile-llm] No embedder configured. Set AGENTIC_SERVER_URL (and defaultEmbedder ' +
              'in preset options or EMBEDDER_PROVIDER / EMBEDDER_MODEL) to enable text-to-vector fields.'
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
              '[graphile-llm] No chat completer configured. Set AGENTIC_SERVER_URL (and defaultChatCompleter ' +
              'in preset options or CHAT_PROVIDER / CHAT_MODEL) to enable RAG queries.'
            );
          }

          return build.extend(build, {
            llmEmbedder: embedder,
            llmChatCompleter: chat,
            llmEmbeddingModel: defaultEmbedder?.model ?? getLlmEnvOptions().embedding.model,
            llmChatModel: defaultChatCompleter?.model ?? getLlmEnvOptions().chat.model
          }, 'LlmModulePlugin adding llmEmbedder, llmChatCompleter, and model names to build');
        }
      }
    }
  };
}
