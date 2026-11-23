/**
 * Provider selection over a registry.
 *
 * A deployment may run several providers of one dialect (two Ollama hosts: one
 * in-cluster, one on a GPU box), so an entry is addressed by its registry
 * `name`, not by its `type`. Model-name routing must also not mistake an
 * open-weights model for a vendor's hosted one.
 */

import { BadRequestError } from '../src/errors';
import { resolveProvider } from '../src/providers';
import type { AgenticServerOptions } from '../src/types';

const twoOllamas: AgenticServerOptions = {
  providers: [
    { name: 'openai', type: 'openai', baseUrl: 'https://api.openai.test', apiKey: 'sk-oai' },
    { name: 'ollama', type: 'ollama', baseUrl: 'http://ollama.svc:11434' },
    { name: 'host-ollama', type: 'ollama', baseUrl: 'http://host.docker.internal:11434' }
  ]
};

describe('resolveProvider by registry name', () => {
  it('selects the second provider of a type when X-LLM-Provider names it', () => {
    const provider = resolveProvider(twoOllamas, 'qwen3:8b', 'host-ollama');
    expect(provider.baseUrl).toBe('http://host.docker.internal:11434');
  });

  it('selects a provider by a `name/model` prefix and strips the prefix', () => {
    const provider = resolveProvider(twoOllamas, 'host-ollama/qwen3:8b');
    expect(provider.baseUrl).toBe('http://host.docker.internal:11434');
    expect(provider.defaultModel).toBe('qwen3:8b');
  });

  it('still answers to the type when an entry carries no name', () => {
    const options: AgenticServerOptions = {
      providers: [
        { type: 'openai', baseUrl: 'https://api.openai.test', apiKey: 'sk-oai' },
        { type: 'ollama', baseUrl: 'http://ollama.svc:11434' }
      ]
    };
    expect(resolveProvider(options, 'anything', 'ollama').baseUrl).toBe('http://ollama.svc:11434');
    expect(resolveProvider(options, 'ollama/qwen3').baseUrl).toBe('http://ollama.svc:11434');
  });

  it('rejects an X-LLM-Provider that names no registered provider instead of routing elsewhere', () => {
    expect(() => resolveProvider(twoOllamas, 'qwen3:8b', 'host-olama')).toThrow(BadRequestError);
    expect(() => resolveProvider(twoOllamas, 'qwen3:8b', 'host-olama')).toThrow(
      "unknown provider 'host-olama'; registered: openai, ollama, host-ollama"
    );
  });
});

describe('resolveProvider by model name', () => {
  const openaiAndOllama: AgenticServerOptions = {
    providers: [
      { type: 'openai', baseUrl: 'https://api.openai.test', apiKey: 'sk-oai' },
      { type: 'ollama', baseUrl: 'http://ollama.svc:11434' }
    ]
  };

  it('routes gpt-oss to ollama, not to openai', () => {
    expect(resolveProvider(openaiAndOllama, 'gpt-oss:20b').type).toBe('ollama');
  });

  it('still routes gpt-4o to openai', () => {
    expect(resolveProvider(openaiAndOllama, 'gpt-4o').type).toBe('openai');
  });

  it('routes qwen and glm to ollama', () => {
    const ollamaLast: AgenticServerOptions = {
      providers: [
        { type: 'anthropic', baseUrl: 'https://api.anthropic.test', apiKey: 'sk-ant' },
        { type: 'ollama', baseUrl: 'http://ollama.svc:11434' }
      ]
    };
    expect(resolveProvider(ollamaLast, 'qwen3:8b').type).toBe('ollama');
    expect(resolveProvider(ollamaLast, 'glm-4.6').type).toBe('ollama');
  });
});
