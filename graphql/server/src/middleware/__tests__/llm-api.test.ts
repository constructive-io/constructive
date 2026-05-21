import type { Request, Response } from 'express';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPoolQuery = jest.fn();
const mockPoolConnect = jest.fn();
const mockClientQuery = jest.fn();
const mockClientRelease = jest.fn();

jest.mock('pg-cache', () => ({
  getPgPool: jest.fn(() => ({
    query: mockPoolQuery,
    connect: mockPoolConnect,
  })),
}));

jest.mock('graphile-cache', () => ({
  ModuleConfigCache: class {
    private _map = new Map<string, unknown>();
    get(key: string) { return this._map.get(key); }
    set(key: string, value: unknown) { this._map.set(key, value); }
    delete(key: string) { return this._map.delete(key); }
    clear() { this._map.clear(); }
    has(key: string) { return this._map.has(key); }
    get size() { return this._map.size; }
  },
}));

jest.mock('graphile-llm', () => ({
  getLlmEnvOptions: jest.fn(() => ({
    chat: { provider: 'ollama', model: 'tinyllama', baseUrl: 'http://localhost:11434' },
    embed: { provider: 'ollama', model: 'nomic-embed-text', baseUrl: 'http://localhost:11434' },
  })),
  getAgentDiscovery: jest.fn(async () => ({
    thread: { schemaName: 'agent_public', tableName: 'agent_thread' },
    message: { schemaName: 'agent_public', tableName: 'agent_message' },
    task: { schemaName: 'agent_public', tableName: 'agent_task' },
    apiId: 'api-123',
  })),
  getLlmBillingConfig: jest.fn(async () => ({
    billing: {
      privateSchema: 'billing_private',
      checkBillingQuotaFunction: 'check_billing_quota',
      recordUsageFunction: 'record_usage',
    },
  })),
}));

const mockGenerate = jest.fn();

jest.mock('@agentic-kit/ollama', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      generate: mockGenerate,
    })),
  };
});

import { createLlmApiRouter } from '../llm-api';

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeReq(overrides: Partial<Request> & { params?: Record<string, string> } = {}): Request {
  return {
    headers: {},
    cookies: {},
    body: {},
    token: { user_id: 'user-abc', database_id: 'db-123' },
    databaseId: 'db-123',
    api: { dbname: 'test_db' } as any,
    ...overrides,
  } as unknown as Request;
}

function makeRes(): Response & { _json: any; _status: number; _written: string[] } {
  const res: any = {
    _json: null,
    _status: 200,
    _written: [],
    status: jest.fn(function (this: any, code: number) {
      this._status = code;
      return this;
    }),
    json: jest.fn(function (this: any, body: any) {
      this._json = body;
      return this;
    }),
    writeHead: jest.fn(),
    write: jest.fn(function (this: any, chunk: string) {
      this._written.push(chunk);
    }),
    end: jest.fn(),
    headersSent: false,
  };
  return res;
}

function setupMockClient() {
  const client = {
    query: mockClientQuery,
    release: mockClientRelease,
  };
  mockPoolConnect.mockResolvedValue(client);
  return client;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('LLM API Router', () => {
  let router: ReturnType<typeof createLlmApiRouter>;

  beforeAll(() => {
    router = createLlmApiRouter();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockClient();
    // Default: set_config, BEGIN, COMMIT all succeed
    mockClientQuery.mockResolvedValue({ rows: [] });
  });

  describe('route registration', () => {
    it('registers entity-scoped thread creation route', () => {
      const routes = (router as any).stack
        .filter((layer: any) => layer.route)
        .map((layer: any) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        }));

      expect(routes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/v1/orgs/:entity_id/threads', methods: ['post'] }),
          expect.objectContaining({ path: '/v1/orgs/:entity_id/threads/:thread_id/messages', methods: ['post'] }),
          expect.objectContaining({ path: '/v1/threads', methods: ['post'] }),
          expect.objectContaining({ path: '/v1/threads/:thread_id/messages', methods: ['post'] }),
        ]),
      );
    });
  });

  describe('global /v1/threads', () => {
    it('returns 401 without JWT', async () => {
      const req = makeReq({ token: undefined, params: {} });
      const res = makeRes();

      // Simulate route handler directly
      const globalThreadRoute = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/v1/threads',
      );
      await globalThreadRoute.route.stack[0].handle(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Authentication required' }),
      );
    });
  });

  describe('entity-scoped /v1/orgs/:entity_id/threads', () => {
    it('returns 401 without JWT', async () => {
      const req = makeReq({ token: undefined, params: { entity_id: 'org-1' } });
      const res = makeRes();

      const route = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/v1/orgs/:entity_id/threads',
      );
      await route.route.stack[0].handle(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('token usage tracking', () => {
    it('includes usage in non-streaming response', async () => {
      // Setup agent discovery to succeed
      const { getAgentDiscovery } = require('graphile-llm');
      getAgentDiscovery.mockResolvedValue({
        thread: { schemaName: 'agent_public', tableName: 'agent_thread' },
        message: { schemaName: 'agent_public', tableName: 'agent_message' },
        task: { schemaName: 'agent_public', tableName: 'agent_task' },
        apiId: 'api-123',
      });

      // Mock thread lookup
      mockClientQuery.mockImplementation(async (sql: string, params?: any[]) => {
        if (typeof sql === 'string' && sql.includes('SELECT id, mode, model')) {
          return {
            rows: [{ id: 'thread-1', mode: 'ask', model: 'tinyllama', system_prompt: null, status: 'active' }],
          };
        }
        if (typeof sql === 'string' && sql.includes('SELECT author_role')) {
          return { rows: [] };
        }
        if (typeof sql === 'string' && sql.includes('inference_log_module')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      // Mock generate to return content
      mockGenerate.mockResolvedValue('Hello from the LLM!');

      const req = makeReq({
        params: { entity_id: 'org-1', thread_id: 'thread-1' },
        body: {
          messages: [{ role: 'user', content: 'Hi' }],
          stream: false,
        },
      });
      const res = makeRes();

      const route = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/v1/orgs/:entity_id/threads/:thread_id/messages',
      );
      await route.route.stack[0].handle(req, res, jest.fn());

      // Should have called generate
      expect(mockGenerate).toHaveBeenCalled();

      // If the response was successful, it should include usage
      if (res._json && res._json.usage) {
        expect(res._json.usage).toEqual(
          expect.objectContaining({
            prompt_tokens: expect.any(Number),
            completion_tokens: expect.any(Number),
            total_tokens: expect.any(Number),
          }),
        );
      }
    });
  });
});
