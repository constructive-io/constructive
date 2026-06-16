import { getEnvVars, getEnvOptions, getLlmEnvOptions, llmDefaults } from '../src';

describe('getEnvVars', () => {
  it('returns empty object when no env vars are set', () => {
    const result = getEnvVars({});
    expect(result).toEqual({});
  });

  it('returns only embedding keys that are set', () => {
    const result = getEnvVars({
      EMBEDDER_PROVIDER: 'openai',
      EMBEDDER_MODEL: 'text-embedding-3-small',
    });
    expect(result).toEqual({
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small',
      },
    });
    expect(result.chat).toBeUndefined();
  });

  it('returns only chat keys that are set', () => {
    const result = getEnvVars({
      CHAT_PROVIDER: 'openai',
      CHAT_MODEL: 'gpt-4o',
      CHAT_BASE_URL: 'https://api.openai.com',
    });
    expect(result).toEqual({
      chat: {
        provider: 'openai',
        model: 'gpt-4o',
        baseUrl: 'https://api.openai.com',
      },
    });
    expect(result.embedding).toBeUndefined();
  });

  it('returns both embedding and chat when both are set', () => {
    const result = getEnvVars({
      EMBEDDER_MODEL: 'nomic-embed-text',
      CHAT_MODEL: 'llama3',
    });
    expect(result.embedding).toEqual({ model: 'nomic-embed-text' });
    expect(result.chat).toEqual({ model: 'llama3' });
  });

  it('supports partial overrides within a section', () => {
    const result = getEnvVars({
      EMBEDDER_MODEL: 'mxbai-embed-large',
    });
    expect(result).toEqual({
      embedding: { model: 'mxbai-embed-large' },
    });
  });
});

describe('getEnvOptions', () => {
  it('returns defaults when no env vars or overrides', () => {
    const result = getEnvOptions({}, {});
    expect(result).toEqual(llmDefaults);
  });

  it('merges env vars over defaults', () => {
    const result = getEnvOptions({}, {
      EMBEDDER_MODEL: 'text-embedding-3-small',
    });
    expect(result.embedding.model).toBe('text-embedding-3-small');
    expect(result.embedding.provider).toBe('ollama');
    expect(result.embedding.baseUrl).toBe('http://localhost:11434');
    expect(result.chat).toEqual(llmDefaults.chat);
  });

  it('merges overrides over env vars over defaults', () => {
    const result = getEnvOptions(
      { embedding: { model: 'override-model' } },
      { EMBEDDER_MODEL: 'env-model' }
    );
    expect(result.embedding.model).toBe('override-model');
    expect(result.embedding.provider).toBe('ollama');
  });

  it('chat overrides apply correctly', () => {
    const result = getEnvOptions(
      { chat: { provider: 'anthropic', model: 'claude-4' } },
      {}
    );
    expect(result.chat.provider).toBe('anthropic');
    expect(result.chat.model).toBe('claude-4');
    expect(result.chat.baseUrl).toBe('http://localhost:11434');
  });
});

describe('getLlmEnvOptions (backward compat)', () => {
  it('returns resolved options using getEnvOptions', () => {
    const result = getLlmEnvOptions({});
    expect(result).toEqual(llmDefaults);
  });

  it('respects env parameter', () => {
    const result = getLlmEnvOptions({
      EMBEDDER_PROVIDER: 'openai',
    });
    expect(result.embedding.provider).toBe('openai');
    expect(result.embedding.model).toBe('nomic-embed-text');
  });
});

describe('llmDefaults', () => {
  it('exports default values', () => {
    expect(llmDefaults.embedding.provider).toBe('ollama');
    expect(llmDefaults.embedding.model).toBe('nomic-embed-text');
    expect(llmDefaults.embedding.baseUrl).toBe('http://localhost:11434');
    expect(llmDefaults.chat.provider).toBe('ollama');
    expect(llmDefaults.chat.model).toBe('llama3');
    expect(llmDefaults.chat.baseUrl).toBe('http://localhost:11434');
  });
});
