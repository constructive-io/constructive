import { withPgClientFromPgService } from '@dataplan/pg';
import type { GraphileConfig } from 'graphile-config';

import { createFunctionBindingsPlugin } from '../plugin';
import type {
  ComputeModuleNames,
  PreloadedFunctionBinding
} from '../types';

jest.mock('@dataplan/pg', () => ({
  ...jest.requireActual('@dataplan/pg'),
  withPgClientFromPgService: jest.fn()
}));

const withPgClientMock = withPgClientFromPgService as unknown as jest.Mock;

const moduleNames: ComputeModuleNames = {
  computeSchema: 'compute_public',
  bindingsTable: 'function_api_bindings',
  definitionsTable: 'function_definitions',
  invocationsSchema: 'compute_public',
  invocationsTable: 'function_invocations',
  invocationsEntityField: null
};

const binding = (): PreloadedFunctionBinding => ({
  bindingId: 'binding-1',
  alias: 'send_email',
  config: {
    graphql: { enabled: true },
    schema: {
      type: 'object',
      properties: { to: { type: 'string' } }
    }
  },
  functionDefinitionId: 'definition-1',
  taskIdentifier: 'app:send_email',
  description: 'Send an email',
  payloadArgs: [{ name: 'to', type: 'text' }],
  module: { ...moduleNames }
});

async function runGather(plugin: GraphileConfig.Plugin, includePgService = false) {
  const output: Record<string, unknown> = {};
  const main = (plugin.gather as any).main as (
    output: Record<string, unknown>,
    info: Record<string, unknown>
  ) => Promise<void>;
  await main(output, {
    resolvedPreset: {
      pgServices: includePgService ? [{ name: 'main' }] : []
    }
  });
  return (output.functionApiBindings as {
    bindings: readonly PreloadedFunctionBinding[];
  }).bindings;
}

describe('FunctionBindingsPlugin preloaded bindings', () => {
  beforeEach(() => {
    withPgClientMock.mockReset();
  });

  it('treats an empty preloaded array as authoritative and performs zero SQL', async () => {
    const plugin = createFunctionBindingsPlugin({
      apiId: 'api-1',
      modules: [],
      preloadedBindings: []
    });

    await expect(runGather(plugin)).resolves.toEqual([]);
    expect(withPgClientMock).not.toHaveBeenCalled();
  });

  it('snapshots nonempty preloaded rows immutably and performs zero SQL', async () => {
    const original = binding();
    const plugin = createFunctionBindingsPlugin({
      apiId: 'api-1',
      modules: [moduleNames],
      preloadedBindings: [original]
    });

    original.alias = 'mutated_after_plugin_creation';
    (original.config!.graphql as { enabled: boolean }).enabled = false;
    original.payloadArgs![0].name = 'mutated';
    original.module.invocationsTable = 'mutated_invocations';

    const loaded = await runGather(plugin);

    expect(withPgClientMock).not.toHaveBeenCalled();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toMatchObject({
      alias: 'send_email',
      payloadArgs: [{ name: 'to', type: 'text' }],
      module: { invocationsTable: 'function_invocations' }
    });
    expect((loaded[0].config!.graphql as { enabled: boolean }).enabled).toBe(true);
    expect(Object.isFrozen(loaded)).toBe(true);
    expect(Object.isFrozen(loaded[0])).toBe(true);
    expect(Object.isFrozen(loaded[0].config)).toBe(true);
    expect(Object.isFrozen(loaded[0].payloadArgs)).toBe(true);
    expect(Object.isFrozen(loaded[0].module)).toBe(true);
  });

  it('uses the generic SQL loader only when preloadedBindings is undefined', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    withPgClientMock.mockImplementation(
      async (_pgService: unknown, settings: unknown, callback: (client: unknown) => unknown) => {
        expect(settings).toBeNull();
        return callback({ query });
      }
    );
    const plugin = createFunctionBindingsPlugin({
      apiId: 'api-1',
      modules: [moduleNames]
    });

    await expect(runGather(plugin, true)).resolves.toEqual([]);
    expect(withPgClientMock).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
