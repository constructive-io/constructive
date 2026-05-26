import { createJobApp } from '@constructive-io/knative-job-fn';
import { createLogger } from '@pgpmjs/logger';
import { Pool } from 'pg';

import { splitText } from './chunker';
import { buildEmbedder } from './embedder';
import type { ChunkJobPayload, ChunkStrategy } from './types';

const logger = createLogger('generate-chunks');
const app = createJobApp();

// Reuse a single pool across requests (connection params from PG* env vars)
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'password',
      database: process.env.PGDATABASE || 'postgres',
      max: 5
    });
  }
  return pool;
}

function parsePayload(body: Record<string, unknown>): ChunkJobPayload {
  const required = ['table', 'schema', 'id', 'chunks_table'] as const;
  for (const key of required) {
    if (!body[key]) {
      throw new Error(`Missing required payload field: ${key}`);
    }
  }
  return {
    table: String(body.table),
    schema: String(body.schema),
    id: String(body.id),
    chunks_table: String(body.chunks_table),
    chunk_size: String(body.chunk_size || '1000'),
    chunk_overlap: String(body.chunk_overlap || '200'),
    chunk_strategy: String(body.chunk_strategy || 'paragraph')
  };
}

app.post('/', async (req: any, res: any, next: any) => {
  try {
    const payload = parsePayload(req.body);
    const databaseId = req.get('X-Database-Id');

    logger.info('Processing chunk job', {
      table: payload.table,
      schema: payload.schema,
      id: payload.id,
      chunks_table: payload.chunks_table,
      databaseId
    });

    const pg = getPool();
    const chunkSize = parseInt(payload.chunk_size, 10);
    const chunkOverlap = parseInt(payload.chunk_overlap, 10);
    const strategy = payload.chunk_strategy as ChunkStrategy;

    // 1. Read the parent row's content
    const parentQuery = `
      SELECT content, id
      FROM "${payload.schema}"."${payload.table}"
      WHERE id = $1
    `;
    const parentResult = await pg.query(parentQuery, [payload.id]);

    if (parentResult.rows.length === 0) {
      logger.warn('Parent row not found, skipping', {
        table: payload.table,
        id: payload.id
      });
      res.status(200).json({ skipped: true, reason: 'parent_not_found' });
      return;
    }

    const parentRow = parentResult.rows[0];
    const content = parentRow.content;

    if (!content || content.trim().length === 0) {
      logger.info('Empty content, skipping', { id: payload.id });
      res.status(200).json({ skipped: true, reason: 'empty_content' });
      return;
    }

    // 2. Split content into chunks
    const chunks = splitText(content, strategy, chunkSize, chunkOverlap);

    logger.info('Text split complete', {
      id: payload.id,
      chunk_count: chunks.length,
      strategy,
      chunkSize,
      chunkOverlap
    });

    if (chunks.length === 0) {
      res.status(200).json({ chunks_created: 0 });
      return;
    }

    // 3. Generate embeddings (optional — depends on provider availability)
    const embedder = buildEmbedder();
    let embeddings: (number[] | null)[] = [];

    if (embedder) {
      logger.info('Generating embeddings', { chunk_count: chunks.length });
      embeddings = await Promise.all(
        chunks.map(async (chunk) => {
          try {
            return await embedder(chunk.content);
          } catch (err) {
            logger.warn('Embedding failed for chunk, inserting without embedding', {
              chunk_index: chunk.chunk_index,
              error: (err as Error).message
            });
            return null;
          }
        })
      );
    } else {
      logger.info('No embedder available, inserting chunks without embeddings');
      embeddings = chunks.map((): number[] | null => null);
    }

    // 4. Delete existing chunks for this parent row (re-chunking)
    const fkColumn = payload.table + '_id';
    const deleteQuery = `
      DELETE FROM "${payload.schema}"."${payload.chunks_table}"
      WHERE "${fkColumn}" = $1
    `;
    await pg.query(deleteQuery, [payload.id]);

    // 5. Insert chunks
    const client = await pg.connect();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];

        if (embedding) {
          const insertQuery = `
            INSERT INTO "${payload.schema}"."${payload.chunks_table}"
              ("${fkColumn}", content, chunk_index, embedding, metadata)
            VALUES ($1, $2, $3, $4::vector, $5::jsonb)
          `;
          await client.query(insertQuery, [
            payload.id,
            chunk.content,
            chunk.chunk_index,
            `[${embedding.join(',')}]`,
            JSON.stringify(chunk.metadata)
          ]);
        } else {
          const insertQuery = `
            INSERT INTO "${payload.schema}"."${payload.chunks_table}"
              ("${fkColumn}", content, chunk_index, metadata)
            VALUES ($1, $2, $3, $4::jsonb)
          `;
          await client.query(insertQuery, [
            payload.id,
            chunk.content,
            chunk.chunk_index,
            JSON.stringify(chunk.metadata)
          ]);
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    logger.info('Chunks inserted', {
      id: payload.id,
      chunks_created: chunks.length,
      embeddings_generated: embeddings.filter(Boolean).length
    });

    res.status(200).json({
      chunks_created: chunks.length,
      embeddings_generated: embeddings.filter(Boolean).length
    });
  } catch (err) {
    next(err);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info(`generate-chunks function listening on port ${PORT}`);
});

export { splitText } from './chunker';
export { buildEmbedder } from './embedder';
