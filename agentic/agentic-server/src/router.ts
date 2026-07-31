/**
 * Express router — OpenAI-compatible LLM proxy with multi-provider routing.
 *
 * Supports:
 *   - Multiple providers (OpenAI, Anthropic, Ollama) configured at startup
 *   - Model-based routing: "anthropic/claude-3.5-sonnet" → anthropic provider
 *   - Header-based routing: X-LLM-Provider: ollama → ollama provider
 *   - Fire-and-forget inference metering via an injected InferenceSink
 *   - /v1/usage reporting endpoint for external usage submission
 */

import { Logger } from '@pgpmjs/logger';
import { Router } from 'express';

import { buildProviderHeaders, resolveProvider, resolveUpstreamUrl } from './providers';
import {
  transformChatRequest,
  transformChatResponse,
  transformEmbedRequest,
  transformEmbedResponse
} from './transforms';
import type { AgenticServerOptions } from './types';

const log = new Logger('agentic-server');

export const createRouter = (options: AgenticServerOptions): Router => {
  const router = Router();
  // Metering is backend-agnostic: the caller injects an InferenceSink. When
  // none is provided, no usage is recorded.
  const sink = options.inferenceSink;

  // POST /v1/chat/completions — multi-provider LLM proxy
  router.post('/v1/chat/completions', async (req: any, res: any) => {
    const databaseId = req.get('X-Database-Id');
    if (!databaseId) {
      res.status(400).json({ error: { message: 'X-Database-Id is required' } });
      return;
    }
    const entityId = req.get('X-Entity-Id');
    const actorId = req.get('X-Actor-Id');
    const requestProvider = req.get('X-LLM-Provider');
    const startTime = process.hrtime.bigint();

    const provider = resolveProvider(options, req.body?.model, requestProvider);

    log.info('chat/completions', {
      databaseId,
      entityId,
      provider: provider.type,
      model: req.body?.model
    });

    try {
      const upstreamUrl = resolveUpstreamUrl(provider, '/v1/chat/completions');
      const body = transformChatRequest(provider, req.body || {});
      const headers = buildProviderHeaders(provider);

      const upstream = await fetch(upstreamUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const latencyMs = Number(process.hrtime.bigint() - startTime) / 1e6;

      if (!upstream.ok) {
        const text = await upstream.text().catch(() => '');
        log.error('upstream error', { status: upstream.status, provider: provider.type, body: text });

        if (sink) {
          sink.logInference({
            databaseId, entityId, actorId,
            model: String(req.body?.model || body.model || ''),
            provider: provider.type,
            service: 'chat',
            operation: 'chat/completions',
            inputTokens: 0, outputTokens: 0, totalTokens: 0,
            latencyMs,
            status: 'error',
            errorType: `upstream_${upstream.status}`
          });
        }

        res.status(upstream.status).json({
          error: { message: `LLM provider error: ${upstream.status}`, upstream: text }
        });
        return;
      }

      const data = await upstream.json() as Record<string, unknown>;
      const { body: responseBody, usage } = transformChatResponse(data, provider);

      log.info('inference complete', {
        databaseId,
        provider: provider.type,
        model: req.body?.model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens
      });

      if (sink) {
        sink.logInference({
          databaseId, entityId, actorId,
          model: String(req.body?.model || body.model || ''),
          provider: provider.type,
          service: 'chat',
          operation: 'chat/completions',
          inputTokens: usage.prompt_tokens || 0,
          outputTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
          latencyMs,
          status: 'ok',
          rawUsage: usage
        });
      }

      res.json(responseBody);
    } catch (err: any) {
      const latencyMs = Number(process.hrtime.bigint() - startTime) / 1e6;
      log.error('chat/completions error', err);

      if (sink) {
        sink.logInference({
          databaseId, entityId, actorId,
          model: String(req.body?.model || ''),
          provider: provider.type,
          service: 'chat',
          operation: 'chat/completions',
          inputTokens: 0, outputTokens: 0, totalTokens: 0,
          latencyMs,
          status: 'error',
          errorType: err.message
        });
      }

      res.status(502).json({
        error: { message: 'Failed to reach LLM provider', details: err.message }
      });
    }
  });

  // POST /v1/embeddings — multi-provider embedding proxy
  router.post('/v1/embeddings', async (req: any, res: any) => {
    const databaseId = req.get('X-Database-Id');
    if (!databaseId) {
      res.status(400).json({ error: { message: 'X-Database-Id is required' } });
      return;
    }
    const entityId = req.get('X-Entity-Id');
    const actorId = req.get('X-Actor-Id');
    const requestProvider = req.get('X-LLM-Provider');
    const startTime = process.hrtime.bigint();

    const provider = resolveProvider(options, req.body?.model, requestProvider);

    log.info('embeddings', { databaseId, entityId, provider: provider.type, model: req.body?.model });

    try {
      const upstreamUrl = resolveUpstreamUrl(provider, '/v1/embeddings');
      const body = transformEmbedRequest(provider, req.body || {});
      const headers = buildProviderHeaders(provider);

      const upstream = await fetch(upstreamUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const latencyMs = Number(process.hrtime.bigint() - startTime) / 1e6;

      if (!upstream.ok) {
        const text = await upstream.text().catch(() => '');
        log.error('upstream embed error', { status: upstream.status, provider: provider.type });

        if (sink) {
          sink.logInference({
            databaseId, entityId, actorId,
            model: String(req.body?.model || body.model || ''),
            provider: provider.type,
            service: 'embed',
            operation: 'embeddings',
            inputTokens: 0, outputTokens: 0, totalTokens: 0,
            latencyMs,
            status: 'error',
            errorType: `upstream_${upstream.status}`
          });
        }

        res.status(upstream.status).json({
          error: { message: `LLM provider error: ${upstream.status}`, upstream: text }
        });
        return;
      }

      const data = await upstream.json() as Record<string, unknown>;
      const { body: responseBody, usage } = transformEmbedResponse(data, provider);

      log.info('embed complete', { databaseId, entityId, provider: provider.type });

      if (sink) {
        sink.logInference({
          databaseId, entityId, actorId,
          model: String(req.body?.model || body.model || ''),
          provider: provider.type,
          service: 'embed',
          operation: 'embeddings',
          inputTokens: usage.prompt_tokens || 0,
          outputTokens: 0,
          totalTokens: usage.total_tokens || 0,
          latencyMs,
          status: 'ok',
          rawUsage: usage
        });
      }

      res.json(responseBody);
    } catch (err: any) {
      const latencyMs = Number(process.hrtime.bigint() - startTime) / 1e6;
      log.error('embeddings error', err);

      if (sink) {
        sink.logInference({
          databaseId, entityId, actorId,
          model: String(req.body?.model || ''),
          provider: provider.type,
          service: 'embed',
          operation: 'embeddings',
          inputTokens: 0, outputTokens: 0, totalTokens: 0,
          latencyMs,
          status: 'error',
          errorType: err.message
        });
      }

      res.status(502).json({
        error: { message: 'Failed to reach LLM provider', details: err.message }
      });
    }
  });

  // POST /v1/usage — external usage reporting endpoint
  router.post('/v1/usage', (req: any, res: any) => {
    const databaseId = req.get('X-Database-Id');
    if (!databaseId) {
      res.status(400).json({ error: { message: 'X-Database-Id is required' } });
      return;
    }
    const entityId = req.get('X-Entity-Id');
    const actorId = req.get('X-Actor-Id');

    const {
      model,
      provider: reportedProvider,
      service,
      operation,
      input_tokens,
      output_tokens,
      total_tokens,
      latency_ms,
      status,
      error_type,
      raw_usage
    } = req.body || {};

    if (!model) {
      res.status(400).json({ error: { message: 'model is required' } });
      return;
    }

    if (sink) {
      sink.logInference({
        databaseId,
        entityId,
        actorId,
        model: String(model),
        provider: String(reportedProvider || 'unknown'),
        service: (service === 'embed' ? 'embed' : 'chat') as 'chat' | 'embed',
        operation: operation || 'external',
        inputTokens: Number(input_tokens) || 0,
        outputTokens: Number(output_tokens) || 0,
        totalTokens: Number(total_tokens) || 0,
        latencyMs: Number(latency_ms) || 0,
        status: status === 'error' ? 'error' : 'ok',
        errorType: error_type || undefined,
        rawUsage: raw_usage || undefined
      });
    }

    res.status(202).json({ accepted: true });
  });

  // GET /v1/providers — list configured providers
  router.get('/v1/providers', (_req: any, res: any) => {
    const providers = options.providers || [{
      type: options.providerType || 'ollama',
      baseUrl: options.providerBaseUrl || 'http://localhost:11434'
    }];
    res.json({
      providers: providers.map((p) => ({
        type: p.type,
        defaultModel: p.defaultModel
      }))
    });
  });

  // GET /healthz — health check
  router.get('/healthz', (_req: any, res: any) => {
    const providers = options.providers || [{
      type: options.providerType || 'ollama',
      baseUrl: options.providerBaseUrl || 'http://localhost:11434'
    }];
    res.json({
      status: 'ok',
      provider: providers[0]?.type || 'ollama',
      providerUrl: providers[0]?.baseUrl || options.providerBaseUrl,
      providers: providers.map((p) => p.type)
    });
  });

  return router;
};
