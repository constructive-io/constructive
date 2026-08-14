import type { ExtensionAPI, ProviderConfig } from '@earendil-works/pi-coding-agent';

import { createMeteredModelExtension } from '../src';

const models = [
  { id: 'anthropic/claude-sonnet-4', contextWindow: 200000, maxTokens: 8192 },
  { id: 'openai/gpt-5', contextWindow: 400000, maxTokens: 16384 }
];

const options = {
  gatewayUrl: 'https://agentic.example.com',
  identity: { databaseId: 'db-1', runToken: 'tok-1' },
  models
};

interface FakePi {
  api: ExtensionAPI;
  providers: { name: string; config: ProviderConfig }[];
  handlers: Map<string, (event: unknown, ctx: unknown) => Promise<void> | void>;
  setModel: jest.Mock;
}

function fakePi(modelAccepted = true): FakePi {
  const providers: FakePi['providers'] = [];
  const handlers = new Map<string, (event: unknown, ctx: unknown) => Promise<void> | void>();
  const setModel = jest.fn().mockResolvedValue(modelAccepted);
  const api = {
    registerProvider: (name: string, config: ProviderConfig) => providers.push({ name, config }),
    on: (event: string, handler: (event: unknown, ctx: unknown) => Promise<void> | void) => handlers.set(event, handler),
    setModel
  } as unknown as ExtensionAPI;
  return { api, providers, handlers, setModel };
}

function fakeCtx(found: unknown) {
  const find = jest.fn().mockReturnValue(found);
  return { ctx: { modelRegistry: { find } } as never, find };
}

describe('createMeteredModelExtension', () => {
  it('registers the gateway provider under the default name', () => {
    const pi = fakePi();
    createMeteredModelExtension(options).extension(pi.api);

    expect(pi.providers).toHaveLength(1);
    expect(pi.providers[0].name).toBe('constructive-gateway');
    expect(pi.providers[0].config.baseUrl).toBe('https://agentic.example.com');
  });

  it('honours a custom provider name', () => {
    const pi = fakePi();
    const ext = createMeteredModelExtension({ ...options, providerName: 'tenant-gateway' });
    ext.extension(pi.api);

    expect(pi.providers[0].name).toBe('tenant-gateway');
    expect(ext.providerName).toBe('tenant-gateway');
  });

  it('selects the first model on session start', async () => {
    const pi = fakePi();
    const ext = createMeteredModelExtension(options);
    ext.extension(pi.api);

    expect(ext.selectedModel).toBe('anthropic/claude-sonnet-4');

    const model = { id: 'anthropic/claude-sonnet-4' };
    const { ctx, find } = fakeCtx(model);
    await pi.handlers.get('session_start')!({ type: 'session_start' }, ctx);

    expect(find).toHaveBeenCalledWith('constructive-gateway', 'anthropic/claude-sonnet-4');
    expect(pi.setModel).toHaveBeenCalledWith(model);
  });

  it('selects an explicitly requested model', async () => {
    const pi = fakePi();
    const ext = createMeteredModelExtension({ ...options, selectModel: 'openai/gpt-5' });
    ext.extension(pi.api);

    const { ctx, find } = fakeCtx({ id: 'openai/gpt-5' });
    await pi.handlers.get('session_start')!({ type: 'session_start' }, ctx);

    expect(find).toHaveBeenCalledWith('constructive-gateway', 'openai/gpt-5');
    expect(ext.selectedModel).toBe('openai/gpt-5');
  });

  it('rejects selecting a model it does not register, which would silently stay unmetered', () => {
    expect(() => createMeteredModelExtension({ ...options, selectModel: 'anthropic/other' })).toThrow(
      /not one of the registered models/
    );
  });

  it('leaves the host model choice alone when selection is disabled', () => {
    const pi = fakePi();
    const ext = createMeteredModelExtension({ ...options, selectModel: false });
    ext.extension(pi.api);

    expect(ext.selectedModel).toBeUndefined();
    expect(pi.handlers.size).toBe(0);
    expect(pi.providers).toHaveLength(1);
  });

  it('fails loudly when the model is missing after registration', async () => {
    const pi = fakePi();
    createMeteredModelExtension(options).extension(pi.api);

    const { ctx } = fakeCtx(undefined);
    await expect(pi.handlers.get('session_start')!({ type: 'session_start' }, ctx)).rejects.toThrow(/has no model/);
  });

  it('fails loudly when pi refuses the model for lack of credentials', async () => {
    const pi = fakePi(false);
    createMeteredModelExtension(options).extension(pi.api);

    const { ctx } = fakeCtx({ id: 'anthropic/claude-sonnet-4' });
    await expect(pi.handlers.get('session_start')!({ type: 'session_start' }, ctx)).rejects.toThrow(
      /refused model .*no usable credentials/
    );
  });

  it('surfaces identity misconfiguration before any turn runs', () => {
    expect(() => createMeteredModelExtension({ ...options, identity: { databaseId: '' } })).toThrow(
      /databaseId is required/
    );
  });
});
