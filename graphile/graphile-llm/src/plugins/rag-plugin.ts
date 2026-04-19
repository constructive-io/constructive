/**
 * LlmRagPlugin
 *
 * Adds RAG (Retrieval-Augmented Generation) query support to PostGraphile v5.
 *
 * When enabled, this plugin:
 * 1. Discovers tables with @hasChunks smart tag during schema build
 * 2. Adds a `ragQuery` root query field that orchestrates:
 *    embed prompt → pgvector search chunks → assemble context → call chat LLM → return answer
 * 3. Adds an `embedText` root query field for standalone text-to-vector conversion
 *
 * Uses the extendSchema + grafast lambda pattern (same as bucket-provisioner
 * and presigned-url plugins) for async operations at execution time.
 *
 * RAG is a consumer of graphile-search's pgvector adapter — it uses the existing
 * chunk-aware tables but orchestrates the full LLM synthesis pipeline.
 *
 * Resolution order for embedder and chat completer:
 *   1. build.llmEmbedder / build.llmChatCompleter (from LlmModulePlugin)
 *   2. Falls back to error if not configured
 */

import { context as grafastContext, lambda, object } from 'grafast';
import type { GraphileConfig } from 'graphile-config';
import { extendSchema, gql } from 'graphile-utils';
import type { EmbedderFunction, ChatFunction, ChunkTableInfo, RagDefaults } from '../types';

// ─── TypeScript Augmentation ────────────────────────────────────────────────

declare global {
  namespace GraphileConfig {
    interface Plugins {
      LlmRagPlugin: true;
    }
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_CONTEXT_LIMIT = 5;
const DEFAULT_MAX_TOKENS = 4000;
const DEFAULT_MIN_SIMILARITY = 0;
const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful assistant. Answer the user\'s question based ONLY on the ' +
  'following context. If the context does not contain enough information to ' +
  'answer, say so. Do not make up information.\n\n' +
  '--- CONTEXT ---\n';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parse @hasChunks smart tag from a codec's extensions into ChunkTableInfo.
 * Mirrors the parsing logic in graphile-search's pgvector adapter.
 */
function parseHasChunksTag(raw: any, codec: any): ChunkTableInfo | null {
  let parsed: any;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  } else if (typeof raw === 'object' && raw !== null) {
    parsed = raw;
  } else {
    return null;
  }

  if (!parsed.chunksTable) return null;

  const chunksSchema = parsed.chunksSchema
    || codec?.extensions?.pg?.schemaName
    || null;

  return {
    parentCodecName: codec.name || 'unknown',
    chunksSchema,
    chunksTableName: parsed.chunksTable,
    parentFkField: parsed.parentFk || 'parent_id',
    parentPkField: parsed.parentPk || 'id',
    embeddingField: parsed.embeddingField || 'embedding',
    contentField: parsed.contentField || 'content',
  };
}

/**
 * Discover all chunk-aware tables from the pgRegistry.
 */
function discoverChunkTables(build: any): ChunkTableInfo[] {
  const chunkTables: ChunkTableInfo[] = [];
  const pgRegistry = build.pgRegistry;
  if (!pgRegistry) return chunkTables;

  // Scan all codecs for @hasChunks smart tag
  for (const source of Object.values(pgRegistry.pgResources || {})) {
    const codec = (source as any)?.codec;
    if (!codec?.attributes) continue;

    const tags = codec.extensions?.tags;
    if (!tags?.hasChunks) continue;

    const info = parseHasChunksTag(tags.hasChunks, codec);
    if (info) {
      chunkTables.push(info);
    }
  }

  return chunkTables;
}

/**
 * Build a SQL query string to search a chunks table for similar embeddings.
 */
function buildChunkSearchSql(
  table: ChunkTableInfo,
  vectorString: string,
  limit: number,
  maxDistance: number | null,
): { text: string; values: any[] } {
  const schema = table.chunksSchema;
  const qualifiedTable = schema
    ? `"${schema}"."${table.chunksTableName}"`
    : `"${table.chunksTableName}"`;

  const embeddingCol = `"${table.embeddingField}"`;
  const contentCol = `"${table.contentField}"`;
  const parentFkCol = `"${table.parentFkField}"`;

  let text = `
    SELECT
      ${contentCol} AS content,
      ${parentFkCol}::text AS parent_id,
      (${embeddingCol} <=> $1::vector) AS distance
    FROM ${qualifiedTable}
  `;

  const values: any[] = [vectorString];

  if (maxDistance !== null) {
    text += ` WHERE (${embeddingCol} <=> $1::vector) <= $2`;
    values.push(maxDistance);
  }

  text += ` ORDER BY ${embeddingCol} <=> $1::vector LIMIT $${values.length + 1}`;
  values.push(limit);

  return { text, values };
}

/**
 * Assemble retrieved chunks into a context string for the LLM prompt.
 */
function assembleContext(
  chunks: Array<{ content: string; parent_id: string; distance: number; table_name: string }>,
): string {
  return chunks
    .map((chunk, i) => `[Source ${i + 1}] (similarity: ${(1 - chunk.distance).toFixed(3)})\n${chunk.content}`)
    .join('\n\n---\n\n');
}

// ─── Plugin Factory ─────────────────────────────────────────────────────────

/**
 * Creates the LlmRagPlugin.
 *
 * @param ragDefaults - Default configuration for RAG queries
 */
export function createLlmRagPlugin(
  ragDefaults: RagDefaults = {},
): GraphileConfig.Plugin {
  // Chunk tables discovered during schema build, used by the plan at execution time
  let chunkTables: ChunkTableInfo[] = [];
  let embedder: EmbedderFunction | null = null;
  let chatCompleter: ChatFunction | null = null;

  const schemaExtension = extendSchema((build) => {
    // Discover chunk-aware tables from pgRegistry
    chunkTables = discoverChunkTables(build);
    embedder = (build as any).llmEmbedder || null;
    chatCompleter = (build as any).llmChatCompleter || null;

    if (chunkTables.length > 0) {
      console.log(
        `[graphile-llm] RAG plugin discovered ${chunkTables.length} chunk-aware table(s): ` +
        chunkTables.map((t) => t.parentCodecName).join(', ')
      );
    } else {
      console.log(
        '[graphile-llm] RAG plugin found no @hasChunks tables. ' +
        'ragQuery will still work if chunks tables are queried directly.'
      );
    }

    return {
      typeDefs: gql`
        """A source chunk retrieved during RAG context assembly."""
        type RagSource {
          """The text content of the retrieved chunk."""
          content: String!
          """Cosine similarity score (0..1, higher = more similar)."""
          similarity: Float!
          """The parent table this chunk belongs to."""
          tableName: String
          """The parent row ID this chunk belongs to."""
          parentId: String
        }

        """Response from a RAG (Retrieval-Augmented Generation) query."""
        type RagResponse {
          """The LLM-generated answer based on retrieved context."""
          answer: String!
          """The source chunks used as context for the answer."""
          sources: [RagSource!]!
          """Approximate token count for the request (logging only, not metered)."""
          tokensUsed: Int
        }

        """Response from an embedText query."""
        type EmbedTextResponse {
          """The resulting vector embedding."""
          vector: [Float!]!
          """Number of dimensions in the vector."""
          dimensions: Int!
        }

        extend type Query {
          """
          RAG (Retrieval-Augmented Generation) query.
          Embeds the prompt, searches chunk-aware tables for similar content,
          assembles context, and calls the chat LLM to generate an answer.
          Requires both an embedding provider and a chat provider to be configured.
          """
          ragQuery(
            """The natural language question or prompt."""
            prompt: String!
            """Maximum number of context chunks to include (default: 5)."""
            contextLimit: Int
            """Minimum similarity threshold (0..1). Chunks below this are excluded."""
            minSimilarity: Float
            """Custom system prompt. Overrides the default RAG system prompt."""
            systemPrompt: String
          ): RagResponse

          """
          Convert text to a vector embedding using the configured embedding provider.
          Useful for client-side vector operations when you need the raw vector.
          """
          embedText(
            """The text to embed."""
            text: String!
          ): EmbedTextResponse
        }
      `,
      plans: {
        Query: {
          ragQuery(_$root: any, fieldArgs: any) {
            const $prompt = fieldArgs.getRaw('prompt');
            const $contextLimit = fieldArgs.getRaw('contextLimit');
            const $minSimilarity = fieldArgs.getRaw('minSimilarity');
            const $systemPrompt = fieldArgs.getRaw('systemPrompt');
            const $withPgClient = (grafastContext() as any).get('withPgClient');
            const $pgSettings = (grafastContext() as any).get('pgSettings');

            const $combined = object({
              prompt: $prompt,
              contextLimit: $contextLimit,
              minSimilarity: $minSimilarity,
              systemPrompt: $systemPrompt,
              withPgClient: $withPgClient,
              pgSettings: $pgSettings,
            });

            return lambda($combined, async (input: any) => {
              const {
                prompt,
                contextLimit: queryContextLimit,
                minSimilarity: queryMinSimilarity,
                systemPrompt: querySystemPrompt,
                withPgClient,
                pgSettings,
              } = input;

              if (!prompt || typeof prompt !== 'string') {
                throw new Error('RAG_INVALID_PROMPT: prompt is required');
              }

              if (!embedder) {
                throw new Error(
                  'RAG_EMBEDDER_NOT_CONFIGURED: An embedding provider must be configured ' +
                  'to use ragQuery. Set defaultEmbedder in GraphileLlmPreset options.'
                );
              }

              if (!chatCompleter) {
                throw new Error(
                  'RAG_CHAT_NOT_CONFIGURED: A chat completion provider must be configured ' +
                  'to use ragQuery. Set defaultChatCompleter in GraphileLlmPreset options.'
                );
              }

              // Resolve parameters with defaults
              const limit = queryContextLimit ?? ragDefaults.contextLimit ?? DEFAULT_CONTEXT_LIMIT;
              const minSim = queryMinSimilarity ?? ragDefaults.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
              const maxDistance = minSim > 0 ? (1 - minSim) : null;
              const systemPromptTemplate = querySystemPrompt ?? ragDefaults.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;

              // Step 1: Embed the prompt
              const startEmbed = Date.now();
              const vector = await embedder(prompt);
              const embedLatency = Date.now() - startEmbed;
              const vectorString = `[${vector.join(',')}]`;

              console.log(
                `[graphile-llm] RAG embed: dims=${vector.length}, latency=${embedLatency}ms`
              );

              // Step 2: Search chunks tables for similar content
              const allChunks: Array<{
                content: string;
                parent_id: string;
                distance: number;
                table_name: string;
              }> = [];

              if (chunkTables.length > 0) {
                await withPgClient(pgSettings, async (pgClient: any) => {
                  for (const table of chunkTables) {
                    const query = buildChunkSearchSql(table, vectorString, limit, maxDistance);
                    const result = await pgClient.query(query);
                    for (const row of result.rows) {
                      allChunks.push({
                        content: row.content,
                        parent_id: row.parent_id,
                        distance: parseFloat(row.distance),
                        table_name: table.parentCodecName,
                      });
                    }
                  }
                });
              }

              // Sort by distance (ascending) and take top N
              allChunks.sort((a, b) => a.distance - b.distance);
              const topChunks = allChunks.slice(0, limit);

              if (topChunks.length === 0) {
                return {
                  answer: 'No relevant context found for your query. ' +
                    'Try broadening your search or lowering the minimum similarity threshold.',
                  sources: [],
                  tokensUsed: null,
                };
              }

              // Step 3: Assemble context
              const contextText = assembleContext(topChunks);

              // Step 4: Call chat completion
              const startChat = Date.now();
              const answer = await chatCompleter([
                { role: 'system', content: systemPromptTemplate + contextText },
                { role: 'user', content: prompt },
              ], {
                maxTokens: ragDefaults.maxTokens ?? DEFAULT_MAX_TOKENS,
              });
              const chatLatency = Date.now() - startChat;

              console.log(
                `[graphile-llm] RAG chat: sources=${topChunks.length}, latency=${chatLatency}ms`
              );

              // Step 5: Return response
              return {
                answer,
                sources: topChunks.map((chunk) => ({
                  content: chunk.content,
                  similarity: 1 - chunk.distance,
                  tableName: chunk.table_name,
                  parentId: chunk.parent_id,
                })),
                tokensUsed: null as number | null, // Deferred to metering system
              };
            });
          },

          embedText(_$root: any, fieldArgs: any) {
            const $text = fieldArgs.getRaw('text');

            return lambda($text, async (text: any) => {
              if (!text || typeof text !== 'string') {
                throw new Error('EMBED_INVALID_TEXT: text is required');
              }

              if (!embedder) {
                throw new Error(
                  'EMBED_NOT_CONFIGURED: An embedding provider must be configured ' +
                  'to use embedText. Set defaultEmbedder in GraphileLlmPreset options.'
                );
              }

              const startTime = Date.now();
              const vector = await embedder(text);
              const latencyMs = Date.now() - startTime;

              console.log(
                `[graphile-llm] embedText: dims=${vector.length}, latency=${latencyMs}ms`
              );

              return {
                vector,
                dimensions: vector.length,
              };
            });
          },
        },
      },
    };
  });

  return {
    ...schemaExtension,
    name: 'LlmRagPlugin',
    version: '0.1.0',
    description:
      'RAG (Retrieval-Augmented Generation) query support — ' +
      'detects @hasChunks tables and adds ragQuery/embedText fields',
    after: [
      'LlmModulePlugin',
      'UnifiedSearchPlugin',
      'VectorCodecPlugin',
    ],
  };
}
