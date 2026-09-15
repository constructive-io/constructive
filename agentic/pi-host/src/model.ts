// The model a resource Job talks to: the tenant's metered gateway, never a
// provider.
//
// `agentic-server` is OpenAI-compatible and already deployed as the platform's
// `AGENTIC_SERVER_URL`, and the three identity headers it meters on are the
// ones `compute/runtimes/node/src/agent.ts` already sends. So the model
// descriptor is the agentic stack's own (`OpenAIAdapter.createModel`), pointed
// at that base URL, and nothing here holds a provider key: the gateway owns the
// credential, the quota and the ledger.
//
// The transport is the one thing that cannot be the adapter's. `OpenAIAdapter`
// only speaks SSE (`stream: true`), and the gateway is a request/response proxy
// — it reads the upstream answer with `response.json()` and meters the `usage`
// block, which a streamed answer does not carry. So `streamFn` below is a
// single non-streaming POST rendered as the event stream `Agent` consumes: one
// `text_start`/`text_delta`/`text_end` for the answer, one `toolcall_end` per
// tool call, then `done`. Every event the agent loop and the transcript writer
// need, and no second metering path.

import type {
  AssistantMessage,
  AssistantMessageEventStream,
  Context,
  JsonValue,
  Message,
  ModelDescriptor,
  StopReason,
  StreamOptions,
  ToolCallContent
} from '@agentic-kit/chat';
import {
  calculateUsageCost,
  createAssistantMessage,
  createAssistantMessageEventStream,
  createToolCall,
  OpenAIAdapter
} from '@agentic-kit/chat';

/** Who the inference is billed to. Mirrors the http runtime's `AgentHeaders`. */
export interface MeteredIdentity {
  databaseId: string;
  entityId?: string | null;
  organizationId?: string | null;
  actorId?: string | null;
}

export interface MeteredModelOptions extends MeteredIdentity {
  /** `AGENTIC_SERVER_URL` — the gateway's root, with or without `/v1`. */
  agenticServerUrl: string;
  /** The model id the persona selected. */
  model: string;
  /** Injectable for tests; defaults to the runtime's `fetch`. */
  fetchImpl?: typeof fetch;
}

export interface MeteredModel {
  model: ModelDescriptor;
  /** `Agent`'s `streamFn`. */
  streamFn: (
    model: ModelDescriptor,
    context: Context,
    options?: StreamOptions
  ) => AssistantMessageEventStream;
}

/**
 * The identity headers `agentic-server` meters against. `X-Database-Id` is
 * required; the billing entity falls back the way the node runtime falls back,
 * so a run launched without an entity still bills the actor's personal org.
 */
export function meteringHeaders(identity: MeteredIdentity): Record<string, string> {
  const headers: Record<string, string> = { 'X-Database-Id': identity.databaseId };
  const billingEntity = identity.entityId ?? identity.organizationId ?? identity.actorId;
  if (billingEntity) headers['X-Entity-Id'] = billingEntity;
  if (identity.actorId) headers['X-Actor-Id'] = identity.actorId;
  return headers;
}

/**
 * The gateway's OpenAI-compatible api root, `<host>/v1`, whichever form the
 * projection took.
 *
 * `AGENTIC_SERVER_URL` is documented as the bare root, but an operator reading a
 * provider's own docs sets it with `/v1` — and `resolveMeteredGateway` accepts
 * both, so the two halves of one stack disagreed: appending `/v1` unconditionally
 * posted to `<host>/v1/v1/chat/completions`, which the gateway answers with a 404
 * that surfaces as "no assistant message" naming no url.
 */
export function gatewayApiRoot(agenticServerUrl: string): string {
  return `${agenticServerUrl.replace(/\/+$/, '').replace(/\/v1$/, '')}/v1`;
}

interface OpenAIToolCall {
  id?: string;
  function?: { name?: string; arguments?: string };
}

interface ChatCompletion {
  choices?: Array<{
    message?: { content?: string | null; tool_calls?: OpenAIToolCall[] };
    finish_reason?: string;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export function createMeteredModel(options: MeteredModelOptions): MeteredModel {
  const { agenticServerUrl, model } = options;
  if (!agenticServerUrl) {
    throw new Error(
      'a coding run needs AGENTIC_SERVER_URL — inference goes through the metered ' +
      'gateway, and a resource Job that cannot reach it has no provider of its own'
    );
  }

  const headers = { 'Content-Type': 'application/json', ...meteringHeaders(options) };
  const apiRoot = gatewayApiRoot(agenticServerUrl);
  const url = `${apiRoot}/chat/completions`;
  const doFetch = options.fetchImpl ?? fetch;

  const adapter = new OpenAIAdapter({
    baseUrl: apiRoot,
    provider: 'agentic-server',
    headers
  });

  const streamFn = (
    descriptor: ModelDescriptor,
    context: Context,
    streamOptions?: StreamOptions
  ): AssistantMessageEventStream => {
    const stream = createAssistantMessageEventStream();
    void (async () => {
      const message = createAssistantMessage(descriptor);
      try {
        stream.push({ type: 'start', partial: message });
        const response = await doFetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(buildRequestBody(descriptor, context, streamOptions)),
          ...(streamOptions?.signal ? { signal: streamOptions.signal } : {})
        });
        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new Error(`agentic server answered ${response.status}: ${body}`);
        }
        const completion = (await response.json()) as ChatCompletion;
        const reason = finish(completion, applyCompletion(message, descriptor, completion, stream));
        message.stopReason = reason;
        stream.push({ type: 'done', reason, message });
        stream.end(message);
      } catch (error) {
        message.stopReason = streamOptions?.signal?.aborted ? 'aborted' : 'error';
        message.errorMessage = error instanceof Error ? error.message : String(error);
        stream.push({
          type: 'error',
          reason: message.stopReason === 'aborted' ? 'aborted' : 'error',
          error: message
        });
        stream.end(message);
      }
    })();
    return stream;
  };

  return { model: adapter.createModel(model), streamFn };
}

/** Fill the message from the completion and emit the events that describe it. */
function applyCompletion(
  message: AssistantMessage,
  descriptor: ModelDescriptor,
  completion: ChatCompletion,
  stream: ReturnType<typeof createAssistantMessageEventStream>
): boolean {
  const choice = completion.choices?.[0];
  const text = choice?.message?.content ?? '';
  if (text) {
    const contentIndex = message.content.length;
    message.content.push({ type: 'text', text });
    stream.push({ type: 'text_start', contentIndex, partial: message });
    stream.push({ type: 'text_delta', contentIndex, delta: text, partial: message });
    stream.push({ type: 'text_end', contentIndex, content: text, partial: message });
  }

  let calls = 0;
  for (const raw of choice?.message?.tool_calls ?? []) {
    const toolCall = toToolCall(raw, calls);
    const contentIndex = message.content.length;
    message.content.push(toolCall);
    stream.push({ type: 'toolcall_start', contentIndex, partial: message });
    if (toolCall.rawArguments) {
      stream.push({ type: 'toolcall_delta', contentIndex, delta: toolCall.rawArguments, partial: message });
    }
    stream.push({ type: 'toolcall_end', contentIndex, toolCall, partial: message });
    calls += 1;
  }

  const usage = completion.usage ?? {};
  message.usage.input = usage.prompt_tokens ?? 0;
  message.usage.output = usage.completion_tokens ?? 0;
  message.usage.totalTokens =
    usage.total_tokens ?? (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0);
  calculateUsageCost(descriptor, message.usage);

  return calls > 0;
}

function toToolCall(raw: OpenAIToolCall, index: number): ToolCallContent {
  const toolCall = createToolCall(raw.id ?? `call_${index}`, raw.function?.name ?? '');
  const rawArguments = raw.function?.arguments ?? '';
  if (rawArguments) {
    toolCall.rawArguments = rawArguments;
    // A model that answers with unparseable arguments is the model's error to
    // recover from, so the call still reaches the agent — with no arguments,
    // which the tool will reject — rather than ending the run here.
    try {
      toolCall.arguments = JSON.parse(rawArguments) as Record<string, JsonValue | undefined>;
    } catch {
      toolCall.arguments = {};
    }
  }
  return toolCall;
}

function finish(completion: ChatCompletion, hasToolCalls: boolean): Extract<StopReason, 'stop' | 'length' | 'toolUse'> {
  if (hasToolCalls) return 'toolUse';
  return completion.choices?.[0]?.finish_reason === 'length' ? 'length' : 'stop';
}

function buildRequestBody(
  model: ModelDescriptor,
  context: Context,
  options?: StreamOptions
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: model.id,
    messages: [
      ...(context.systemPrompt ? [{ role: 'system', content: context.systemPrompt }] : []),
      ...context.messages.map(toOpenAIMessage)
    ]
  };
  if (options?.maxTokens !== undefined) body.max_tokens = options.maxTokens;
  if (options?.temperature !== undefined) body.temperature = options.temperature;
  if (context.tools && context.tools.length > 0) {
    body.tools = context.tools.map((tool) => ({
      type: 'function',
      function: { name: tool.name, description: tool.description, parameters: tool.parameters }
    }));
  }
  return body;
}

function toOpenAIMessage(message: Message): Record<string, unknown> {
  if (message.role === 'user') {
    return {
      role: 'user',
      content:
        typeof message.content === 'string'
          ? message.content
          : message.content
            .map((block) => (block.type === 'text' ? block.text : `[image:${block.mimeType}]`))
            .join('\n')
    };
  }

  if (message.role === 'toolResult') {
    return {
      role: 'tool',
      tool_call_id: message.toolCallId,
      content: message.content
        .map((block) => (block.type === 'text' ? block.text : `[image:${block.mimeType}]`))
        .join('\n')
    };
  }

  const text = message.content
    .filter((block) => block.type === 'text' || block.type === 'thinking')
    .map((block) => (block.type === 'text' ? block.text : `<thinking>${block.thinking}</thinking>`))
    .join('\n');
  const toolCalls = message.content
    .filter((block): block is ToolCallContent => block.type === 'toolCall')
    .map((block) => ({
      id: block.id,
      type: 'function',
      function: {
        name: block.name,
        arguments: block.rawArguments ?? JSON.stringify(block.arguments)
      }
    }));

  return {
    role: 'assistant',
    content: text.length > 0 ? text : null,
    ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {})
  };
}
