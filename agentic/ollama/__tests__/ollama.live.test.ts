import OllamaClient, { OllamaAdapter } from '../src';

const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';
const modelId = process.env.OLLAMA_LIVE_MODEL ?? 'qwen3.5:4b';
const reasoningModelId = process.env.OLLAMA_LIVE_REASONING_MODEL ?? 'qwen3:0.6b';
const embedModel = process.env.OLLAMA_LIVE_EMBED_MODEL ?? 'nomic-embed-text:latest';
const hasEmbedModel = process.env.OLLAMA_LIVE_HAS_EMBED_MODEL === '1';
const liveSuite = process.env.OLLAMA_LIVE_SUITE ?? 'smoke';
const runSmoke = liveSuite === 'smoke' || liveSuite === 'extended';
const runExtended = liveSuite === 'extended';
const describeSmoke = runSmoke ? describe : describe.skip;
const describeExtended = runExtended ? describe : describe.skip;
const itWithEmbeddings = hasEmbedModel ? it : it.skip;

describeSmoke('Ollama live smoke', () => {
  jest.setTimeout(60_000);

  it('lists the configured live model', async () => {
    const client = new OllamaClient(baseUrl);
    const models = await client.listModels();

    expect(models).toContain(modelId);
  });

  it('streams a constrained single-word response', async () => {
    const adapter = new OllamaAdapter(baseUrl);
    const model = adapter.createModel(modelId);
    const stream = adapter.stream(
      model,
      {
        systemPrompt: 'Follow the user instruction exactly.',
        messages: [
          {
            role: 'user',
            content: 'Reply with exactly the single word PONG and nothing else.',
            timestamp: Date.now(),
          },
        ],
      },
      { temperature: 0, maxTokens: 128 },
    );

    const eventTypes: string[] = [];
    for await (const event of stream) {
      eventTypes.push(event.type);
    }

    const message = await stream.result();
    const text = message.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()
      .toLowerCase();

    expect(eventTypes).toEqual(
      expect.arrayContaining(['text_start', 'text_delta', 'text_end', 'done']),
    );
    expect(message.stopReason).toBe('stop');
    expect(text).toContain('pong');
  });

  it('reports length stop reasons when generation is deliberately truncated', async () => {
    const adapter = new OllamaAdapter(baseUrl);
    const model = adapter.createModel(modelId);
    const stream = adapter.stream(
      model,
      {
        messages: [
          {
            role: 'user',
            content: 'Write a detailed numbered list from 1 to 100, one item per line.',
            timestamp: Date.now(),
          },
        ],
      },
      { temperature: 0, maxTokens: 8 },
    );

    let doneReason: string | undefined;
    for await (const event of stream) {
      if (event.type === 'done') {
        doneReason = event.reason;
      }
    }

    const message = await stream.result();
    expect(doneReason).toBe('length');
    expect(message.stopReason).toBe('length');
    expect(message.usage.output).toBeGreaterThan(0);
  });

  it('honors abort signals before the response completes', async () => {
    const adapter = new OllamaAdapter(baseUrl);
    const model = adapter.createModel(modelId);
    const controller = new AbortController();
    const stream = adapter.stream(
      model,
      {
        messages: [
          {
            role: 'user',
            content: 'Count upward forever, one number per line.',
            timestamp: Date.now(),
          },
        ],
      },
      { temperature: 0, maxTokens: 512, signal: controller.signal },
    );

    controller.abort();

    for await (const _event of stream) {
      // Drain terminal event.
    }

    const message = await stream.result();
    expect(message.stopReason).toBe('aborted');
  });
});

describeExtended('Ollama live extended', () => {
  jest.setTimeout(60_000);

  it('surfaces reasoning blocks and usage for reasoning-capable models', async () => {
    const adapter = new OllamaAdapter(baseUrl);
    const model = adapter.createModel(modelId);
    const stream = adapter.stream(
      model,
      {
        messages: [
          {
            role: 'user',
            content: 'Reply with exactly the single word PONG and nothing else.',
            timestamp: Date.now(),
          },
        ],
      },
      { temperature: 0 },
    );

    const eventTypes: string[] = [];
    for await (const event of stream) {
      eventTypes.push(event.type);
    }

    const message = await stream.result();
    const text = message.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()
      .toLowerCase();

    expect(eventTypes).toContain('done');
    expect(eventTypes).toContain('text_start');
    expect(eventTypes).toContain('text_end');
    expect(message.usage.input).toBeGreaterThan(0);
    expect(message.usage.output).toBeGreaterThan(0);
    expect(message.usage.totalTokens).toBeGreaterThan(0);
    expect(text).toContain('pong');

    const hasThinking = message.content.some((block) => block.type === 'thinking');
    if (hasThinking) {
      expect(eventTypes).toContain('thinking_start');
      expect(eventTypes).toContain('thinking_end');
    }
  });

  it('returns visible text through the legacy generate helper', async () => {
    const client = new OllamaClient(baseUrl);
    const output = await client.generate({
      model: modelId,
      prompt: 'Reply with exactly the single word BLUE and nothing else.',
      maxTokens: 320,
      temperature: 0,
    });

    expect(output.trim().toLowerCase()).toBe('blue');
  });

  it('maintains short multi-turn context', async () => {
    const client = new OllamaClient(baseUrl);
    const output = await client.generate({
      model: modelId,
      system: 'Follow the user instruction exactly.',
      messages: [
        {
          role: 'user',
          content: 'Remember this exact token: MARBLE. Reply with OK only.',
        },
        {
          role: 'assistant',
          content: 'OK',
        },
        {
          role: 'user',
          content: 'What token did I ask you to remember? Reply with one word only.',
        },
      ],
      maxTokens: 256,
      temperature: 0,
    });

    expect(output.trim().toLowerCase()).toContain('marble');
  });

  itWithEmbeddings('generates local embeddings with token count via /api/embed', async () => {
    const client = new OllamaClient(baseUrl);
    const result = await client.generateEmbedding('hello world', embedModel);

    expect(result).toHaveProperty('embedding');
    expect(result).toHaveProperty('promptTokens');
    expect(Array.isArray(result.embedding)).toBe(true);
    expect(result.embedding.length).toBeGreaterThan(0);
    expect(result.embedding.every((value) => Number.isFinite(value))).toBe(true);
    expect(result.promptTokens).toBeGreaterThan(0);
  });

  itWithEmbeddings('OllamaAdapter.embed() returns embedding with token count', async () => {
    const { OllamaAdapter } = require('../src/index');
    const adapter = new OllamaAdapter(baseUrl);
    const result = await adapter.embed('hello world', embedModel);

    expect(result).toHaveProperty('embedding');
    expect(result).toHaveProperty('promptTokens');
    expect(Array.isArray(result.embedding)).toBe(true);
    expect(result.embedding.length).toBeGreaterThan(0);
    expect(result.promptTokens).toBeGreaterThan(0);
  });
});

describeExtended('Ollama live token-usage audit', () => {
  jest.setTimeout(60_000);

  let reasoningModelReady = false;

  beforeAll(async () => {
    const client = new OllamaClient(baseUrl);
    try {
      const models = await client.listModels();
      reasoningModelReady = models.includes(reasoningModelId);
      if (!reasoningModelReady) {
        console.warn(
          `[usage-audit] skipping: model '${reasoningModelId}' not pulled. Run: ollama pull ${reasoningModelId}`,
        );
      }
    } catch (error) {
      console.warn(`[usage-audit] skipping: failed to list models — ${(error as Error).message}`);
    }
  });

  it('non-reasoning path: usage.totalTokens === input + output and reasoning === 0', async () => {
    if (!reasoningModelReady) return;

    const adapter = new OllamaAdapter(baseUrl);
    const model = adapter.createModel(reasoningModelId, {
      reasoning: false,
      cost: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0 },
    });
    const stream = adapter.stream(
      model,
      {
        messages: [
          {
            role: 'user',
            content: '/no_think\nReply with exactly the single word PONG and nothing else.',
            timestamp: Date.now(),
          },
        ],
      },
      { temperature: 0, maxTokens: 128 },
    );

    for await (const _event of stream) {
      // Drain.
    }

    const message = await stream.result();
    expect(message.usage.input).toBeGreaterThan(0);
    expect(message.usage.output).toBeGreaterThan(0);
    expect(message.usage.totalTokens).toBe(message.usage.input + message.usage.output);
    expect(message.usage.reasoning).toBe(0);
    expect(message.usage.cost.input).toBeGreaterThan(0);
    expect(message.usage.cost.output).toBeGreaterThan(0);
    expect(message.usage.cost.total).toBeCloseTo(
      message.usage.cost.input + message.usage.cost.output,
      10,
    );
  });

  it('reasoning path: thinking events emitted and reasoning stays 0', async () => {
    if (!reasoningModelReady) return;

    const adapter = new OllamaAdapter(baseUrl);
    const model = adapter.createModel(reasoningModelId, { reasoning: true });
    const stream = adapter.stream(
      model,
      {
        messages: [
          {
            role: 'user',
            content: 'What is 17 * 23? Think step by step.',
            timestamp: Date.now(),
          },
        ],
      },
      { temperature: 0, maxTokens: 512 },
    );

    const eventTypes: string[] = [];
    for await (const event of stream) {
      eventTypes.push(event.type);
    }

    const message = await stream.result();
    expect(eventTypes).toEqual(
      expect.arrayContaining(['thinking_start', 'thinking_delta', 'thinking_end']),
    );
    expect(message.content.some((b) => b.type === 'thinking')).toBe(true);
    const thinkingBlock = message.content.find(
      (b): b is { type: 'thinking'; thinking: string } => b.type === 'thinking',
    );
    expect(thinkingBlock!.thinking.length).toBeGreaterThan(0);
    expect(message.usage.input).toBeGreaterThan(0);
    expect(message.usage.output).toBeGreaterThan(0);
    expect(message.usage.totalTokens).toBe(message.usage.input + message.usage.output);
    // Regression guard: Ollama exposes no reasoning token count — must stay 0.
    expect(message.usage.reasoning).toBe(0);
  });

  it('cost fields populate when descriptor has a cost schedule', async () => {
    if (!reasoningModelReady) return;

    const adapter = new OllamaAdapter(baseUrl);
    const model = adapter.createModel(reasoningModelId, {
      reasoning: true,
      cost: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0 },
    });
    const stream = adapter.stream(
      model,
      {
        messages: [
          {
            role: 'user',
            content: 'What is 17 * 23? Think step by step.',
            timestamp: Date.now(),
          },
        ],
      },
      { temperature: 0, maxTokens: 512 },
    );

    for await (const _event of stream) {
      // Drain.
    }

    const message = await stream.result();
    expect(message.usage.cost.input).toBeGreaterThan(0);
    expect(message.usage.cost.output).toBeGreaterThan(0);
    expect(message.usage.cost.total).toBeCloseTo(
      message.usage.cost.input + message.usage.cost.output,
      10,
    );
  });

  it('two-turn cumulative usage matches field-wise sum', async () => {
    if (!reasoningModelReady) return;

    const adapter = new OllamaAdapter(baseUrl);
    const model = adapter.createModel(reasoningModelId, { reasoning: false });

    const stream1 = adapter.stream(
      model,
      {
        messages: [
          { role: 'user', content: 'What is 2+2? Reply with just the number.', timestamp: Date.now() },
        ],
      },
      { temperature: 0, maxTokens: 32 },
    );
    for await (const _event of stream1) {
      // Drain.
    }
    const t1 = await stream1.result();

    const stream2 = adapter.stream(
      model,
      {
        messages: [
          { role: 'user', content: 'What is 3+3? Reply with just the number.', timestamp: Date.now() },
        ],
      },
      { temperature: 0, maxTokens: 32 },
    );
    for await (const _event of stream2) {
      // Drain.
    }
    const t2 = await stream2.result();

    const totalInput = t1.usage.input + t2.usage.input;
    const totalOutput = t1.usage.output + t2.usage.output;
    expect(totalInput).toBe(t1.usage.input + t2.usage.input);
    expect(totalOutput).toBe(t1.usage.output + t2.usage.output);
    expect(t1.usage.totalTokens + t2.usage.totalTokens).toBe(totalInput + totalOutput);
  });
});
