import { ANTHROPIC_MODELS, AnthropicAdapter, type AnthropicOptions } from '@agentic-kit/anthropic';
import { OLLAMA_MODELS,OllamaAdapter, OllamaClient } from '@agentic-kit/ollama';
import {
  OPENAI_COMPATIBLE_MODELS,
  OpenAIAdapter,
  type OpenAIOptions,
} from '@agentic-kit/openai';
import {
  type AssistantMessage,
  type AssistantMessageEventStream,
  type Context,
  createAssistantMessageEventStream,
  createEmptyUsage,
  EventStream,
  getMessageText,
  type LegacyChatMessage,
  type LegacyGenerateInput,
  type LegacyStreamingOptions,
  type ModelDescriptor,
  normalizeContext,
  type ProviderAdapter,
  type StreamOptions,
} from '@agentic-kit/protocol';

import {
  clearModels,
  getModel,
  getModels,
  getProviders as getModelProviders,
  registerModel,
  registerModels,
} from './model-registry.js';
import {
  clearProviders,
  getProvider as getRegisteredProvider,
  getProviders as getRegisteredProviders,
  registerProvider,
  unregisterProviders,
} from './provider-registry.js';
import { transformMessages } from './transform-messages.js';

export * from './transform-messages.js';
export * from '@agentic-kit/protocol';

export { createAssistantMessageEventStream, EventStream, OllamaClient };
export { AnthropicAdapter, OllamaAdapter, OpenAIAdapter };
export type { AnthropicOptions, OpenAIOptions };

export type ChatMessage = LegacyChatMessage;
export type GenerateInput = LegacyGenerateInput;

type NamedProviderAdapter = ProviderAdapter & { name?: string };

registerModels([...OPENAI_COMPATIBLE_MODELS, ...ANTHROPIC_MODELS, ...OLLAMA_MODELS]);
registerProvider(new OpenAIAdapter());
registerProvider(new AnthropicAdapter({ apiKey: '' }));
registerProvider(new OllamaAdapter());

export function stream(
  model: ModelDescriptor,
  context: Context,
  options?: StreamOptions
): AssistantMessageEventStream {
  const provider = getRegisteredProvider(model.api);
  if (!provider) {
    throw new Error(`No provider registered for api '${model.api}'`);
  }

  return streamWithProvider(provider, model, context, options);
}

export async function complete(
  model: ModelDescriptor,
  context: Context,
  options?: StreamOptions
): Promise<AssistantMessage> {
  const response = stream(model, context, options);
  return response.result();
}

export async function completeText(
  model: ModelDescriptor,
  context: Context,
  options?: StreamOptions
): Promise<string> {
  const message = await complete(model, context, options);
  return getMessageText(message);
}

export class AgentKit {
  private readonly providers = new Map<string, NamedProviderAdapter>();
  private current?: NamedProviderAdapter;

  addProvider(provider: NamedProviderAdapter): this {
    this.providers.set(getProviderName(provider), provider);
    if (!this.current) {
      this.current = provider;
    }
    return this;
  }

  setProvider(name: string): this {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' not found`);
    }
    this.current = provider;
    return this;
  }

  getCurrentProvider(): NamedProviderAdapter | undefined {
    return this.current;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async generate(
    input: LegacyGenerateInput,
    options?: LegacyStreamingOptions
  ): Promise<string | void> {
    if (!this.current) {
      throw new Error('No provider set. Call addProvider() first.');
    }

    const provider = this.current;
    const model = createLegacyModel(provider, input.model, input.maxTokens);
    const context = legacyInputToContext(input);
    const streamOptions: StreamOptions = {
      maxTokens: input.maxTokens,
      temperature: input.temperature,
    };

    if (options?.onChunk || input.stream) {
      options?.onStateChange?.('streaming');

      try {
        const response = streamWithProvider(provider, model, context, streamOptions);
        for await (const event of response) {
          if (event.type === 'text_delta') {
            options?.onChunk?.(event.delta);
          }
        }
        assertLegacyGenerateSucceeded(await response.result());
        options?.onComplete?.();
      } catch (error) {
        options?.onError?.(error as Error);
        throw error;
      }

      return;
    }

    try {
      const message = assertLegacyGenerateSucceeded(
        await completeWithProvider(provider, model, context, streamOptions)
      );
      options?.onStateChange?.('complete');
      const text = getMessageText(message);
      options?.onComplete?.();
      return text;
    } catch (error) {
      options?.onError?.(error as Error);
      throw error;
    }
  }

  async listModels(): Promise<string[]> {
    if (!this.current?.listModels) {
      return [];
    }

    const models = await this.current.listModels();
    return models.map((model) => (typeof model === 'string' ? model : model.id));
  }
}

export function createOllamaKit(baseUrl?: string): AgentKit {
  return new AgentKit().addProvider(new OllamaAdapter(baseUrl));
}

export function createAnthropicKit(options: AnthropicOptions | string): AgentKit {
  return new AgentKit().addProvider(new AnthropicAdapter(options));
}

export function createOpenAIKit(options?: OpenAIOptions | string): AgentKit {
  return new AgentKit().addProvider(new OpenAIAdapter(options));
}

export function createMultiProviderKit(): AgentKit {
  return new AgentKit();
}

export {
  clearModels,
  clearProviders,
  getModel,
  getModelProviders,
  getModels,
  getRegisteredProvider as getProvider,
  getRegisteredProviders,
  registerModel,
  registerModels,
  registerProvider,
  unregisterProviders,
};

function legacyInputToContext(input: LegacyGenerateInput): Context {
  const messages: Context['messages'] = input.messages
    ? input.messages
      .filter((message) => message.role !== 'system')
      .map((message) =>
        message.role === 'assistant'
          ? {
            role: 'assistant' as const,
            api: 'legacy',
            provider: 'legacy',
            model: input.model,
            content: [{ type: 'text' as const, text: message.content }],
            usage: createEmptyUsage(),
            stopReason: 'stop' as const,
            timestamp: Date.now(),
          }
          : {
            role: 'user' as const,
            content: message.content,
            timestamp: Date.now(),
          }
      )
    : [{ role: 'user' as const, content: input.prompt ?? '', timestamp: Date.now() }];

  const systemPrompt =
    input.system ?? input.messages?.find((message) => message.role === 'system')?.content;

  return {
    systemPrompt,
    messages,
  };
}

function createLegacyModel(
  provider: NamedProviderAdapter,
  modelId: string,
  maxTokens?: number
): ModelDescriptor {
  if (provider.createModel) {
    return provider.createModel(modelId, {
      maxOutputTokens: maxTokens,
    });
  }

  return {
    id: modelId,
    name: modelId,
    api: provider.api,
    provider: getProviderName(provider),
    baseUrl: '',
    input: ['text'],
    reasoning: false,
    tools: true,
    maxOutputTokens: maxTokens,
  };
}

function streamWithProvider(
  provider: ProviderAdapter,
  model: ModelDescriptor,
  context: Context,
  options?: StreamOptions
): AssistantMessageEventStream {
  const normalized = normalizeContext(context);
  const transformedContext: Context = {
    ...normalized,
    messages: transformMessages(normalized.messages, model),
  };
  return provider.stream(model, transformedContext, options);
}

async function completeWithProvider(
  provider: ProviderAdapter,
  model: ModelDescriptor,
  context: Context,
  options?: StreamOptions
): Promise<AssistantMessage> {
  const response = streamWithProvider(provider, model, context, options);
  return response.result();
}

function getProviderName(provider: NamedProviderAdapter): string {
  return provider.name ?? provider.provider;
}

function assertLegacyGenerateSucceeded(message: AssistantMessage): AssistantMessage {
  if (message.stopReason === 'error' || message.stopReason === 'aborted') {
    throw new Error(
      message.errorMessage ??
        (message.stopReason === 'aborted' ? 'Generation aborted.' : 'Generation failed.'),
      { cause: message }
    );
  }

  return message;
}
