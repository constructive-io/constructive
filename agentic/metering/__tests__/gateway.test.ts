import {
  ACTOR_ID_HEADER,
  buildIdentityHeaders,
  completionsBaseUrl,
  DATABASE_ID_HEADER,
  ENTITY_ID_HEADER,
  GATEWAY_API,
  normalizeGatewayUrl,
  resolveMeteredGateway,
  resolveMeteredModel} from '../src';

const models = [{ id: 'anthropic/claude-sonnet-4', contextWindow: 200000, maxTokens: 8192 }];

describe('buildIdentityHeaders', () => {
  it('sends the gateway identity headers', () => {
    expect(
      buildIdentityHeaders({
        databaseId: 'db-1',
        entityId: 'ent-1',
        actorId: 'actor-1',
        runToken: 'tok-1'
      })
    ).toEqual({
      [DATABASE_ID_HEADER]: 'db-1',
      [ENTITY_ID_HEADER]: 'ent-1',
      [ACTOR_ID_HEADER]: 'actor-1',
      Authorization: 'Bearer tok-1'
    });
  });

  it('omits optional identity rather than sending blanks', () => {
    expect(buildIdentityHeaders({ databaseId: 'db-1', entityId: '  ', actorId: '' })).toEqual({
      [DATABASE_ID_HEADER]: 'db-1'
    });
  });

  it('rejects a missing databaseId up front', () => {
    expect(() => buildIdentityHeaders({ databaseId: '   ' })).toThrow(/databaseId is required/);
  });
});

describe('normalizeGatewayUrl', () => {
  it('keeps the origin and strips trailing slashes', () => {
    expect(normalizeGatewayUrl('https://agentic.example.com/')).toBe('https://agentic.example.com');
    expect(normalizeGatewayUrl(' http://localhost:3000 ')).toBe('http://localhost:3000');
  });

  it('preserves a mount path', () => {
    expect(normalizeGatewayUrl('https://example.com/gateway/')).toBe('https://example.com/gateway');
  });

  it('answers the root for a caller who named the api root instead', () => {
    expect(normalizeGatewayUrl('https://example.com/v1')).toBe('https://example.com');
    expect(normalizeGatewayUrl('https://example.com/gateway/v1/')).toBe('https://example.com/gateway');
  });

  it('rejects relative and non-http urls', () => {
    expect(() => normalizeGatewayUrl('/v1/chat')).toThrow(/absolute URL/);
    expect(() => normalizeGatewayUrl('ws://example.com')).toThrow(/http\(s\)/);
    expect(() => normalizeGatewayUrl('')).toThrow(/gatewayUrl is required/);
  });
});

describe('resolveMeteredModel', () => {
  it('fills the model fields a harness requires with safe defaults', () => {
    expect(resolveMeteredModel(models[0])).toEqual({
      id: 'anthropic/claude-sonnet-4',
      name: 'anthropic/claude-sonnet-4',
      reasoning: false,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 200000,
      maxTokens: 8192
    });
  });

  it('passes through declared capabilities and cost', () => {
    expect(
      resolveMeteredModel({
        id: 'm',
        name: 'M',
        contextWindow: 1,
        maxTokens: 2,
        reasoning: true,
        input: ['text', 'image'],
        cost: { input: 3, output: 4, cacheRead: 5, cacheWrite: 6 }
      })
    ).toMatchObject({ name: 'M', reasoning: true, input: ['text', 'image'], cost: { input: 3, cacheWrite: 6 } });
  });

  it('rejects a blank model id', () => {
    expect(() => resolveMeteredModel({ id: ' ', contextWindow: 1, maxTokens: 1 })).toThrow(/model id is required/);
  });
});

describe('completionsBaseUrl', () => {
  // An openai-completions client appends `/chat/completions` and nothing else, so
  // a baseUrl at the gateway root 404s on the first model turn.
  it('is the api root under the gateway root, however the root was spelled', () => {
    expect(completionsBaseUrl('https://agentic.example.com')).toBe('https://agentic.example.com/v1');
    expect(completionsBaseUrl('https://agentic.example.com/v1')).toBe('https://agentic.example.com/v1');
    expect(completionsBaseUrl('https://example.com/gateway/')).toBe('https://example.com/gateway/v1');
  });
});

describe('resolveMeteredGateway', () => {
  it('resolves the gateway endpoint over the openai-completions api', () => {
    const config = resolveMeteredGateway({
      gatewayUrl: 'https://agentic.example.com',
      identity: { databaseId: 'db-1' },
      models
    });

    expect(config.baseUrl).toBe('https://agentic.example.com/v1');
    expect(config.api).toBe(GATEWAY_API);
    expect(config.models).toHaveLength(1);
    expect(config.headers?.[DATABASE_ID_HEADER]).toBe('db-1');
  });

  it('merges extra headers but never lets them shadow identity', () => {
    const config = resolveMeteredGateway({
      gatewayUrl: 'https://agentic.example.com',
      identity: { databaseId: 'real-db' },
      models,
      headers: { 'X-LLM-Provider': 'anthropic', [DATABASE_ID_HEADER]: 'spoofed' }
    });

    expect(config.headers).toMatchObject({ 'X-LLM-Provider': 'anthropic', [DATABASE_ID_HEADER]: 'real-db' });
  });

  it('uses the run token as the api key so a harness passes its auth check', () => {
    const config = resolveMeteredGateway({
      gatewayUrl: 'https://agentic.example.com',
      identity: { databaseId: 'db-1', runToken: 'tok-1' },
      models
    });

    expect(config.apiKey).toBe('tok-1');
  });

  it('falls back to a placeholder api key when identity travels in headers only', () => {
    const config = resolveMeteredGateway({
      gatewayUrl: 'https://agentic.example.com',
      identity: { databaseId: 'db-1' },
      models
    });

    expect(config.apiKey).toBe('unused');
  });

  it('prefers an explicit api key', () => {
    const config = resolveMeteredGateway({
      gatewayUrl: 'https://agentic.example.com',
      identity: { databaseId: 'db-1', runToken: 'tok-1' },
      models,
      apiKey: 'explicit'
    });

    expect(config.apiKey).toBe('explicit');
  });

  it('requires at least one model', () => {
    expect(() =>
      resolveMeteredGateway({ gatewayUrl: 'https://agentic.example.com', identity: { databaseId: 'db-1' }, models: [] })
    ).toThrow(/at least one model/);
  });
});
