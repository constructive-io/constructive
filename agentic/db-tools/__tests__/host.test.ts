import { z } from 'zod';

import constructiveDbTools, {
  configureHost,
  createConstructiveDbTools,
  getHost,
  toolSchema
} from '../src';

describe('host configuration', () => {
  it('getHost throws before configureHost', () => {
    expect(() => getHost()).toThrow(/host not configured/i);
  });

  it('configureHost + getHost round-trips', () => {
    const host = {
      account: () => ({ userId: 'u1', accessToken: 't1' }),
      backendConfig: () => ({ apiEndpoint: 'http://api.localhost:3000/graphql' }),
    };
    configureHost(host);
    expect(getHost()).toBe(host);
    expect(getHost().account()?.userId).toBe('u1');
  });

  it('createConstructiveDbTools configures the host and returns the tools', () => {
    const host = {
      account: (): null => null,
      backendConfig: (): null => null,
    };
    expect(createConstructiveDbTools(host)).toBe(constructiveDbTools);
    expect(getHost()).toBe(host);
  });
});

describe('toolSchema', () => {
  it('emits plain JSON Schema without a $schema marker', () => {
    const schema = toolSchema(
      z.object({
        table_name: z.string().describe('Table name'),
        rows: z.array(z.record(z.string(), z.unknown())).optional(),
      }),
    ) as unknown as Record<string, unknown>;

    expect(schema.$schema).toBeUndefined();
    expect(schema.type).toBe('object');
    const props = schema.properties as Record<string, Record<string, unknown>>;
    expect(props.table_name).toMatchObject({ type: 'string', description: 'Table name' });
    expect(schema.required).toEqual(['table_name']);
  });
});

describe('constructiveDbTools', () => {
  it('is the 18 db tools, harness-neutral', () => {
    expect(constructiveDbTools).toHaveLength(18);
    expect(constructiveDbTools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        'provision_database',
        'provision_blueprint',
        'describe_schema',
        'add_relation',
        'delete_table',
        'create_field',
        'update_field',
        'delete_field',
        'add_policies',
        'add_records',
        'manage_entity_types',
        'create_api_key',
        'run_codegen',
        'list_templates',
        'create_template',
        'apply_template',
        'update_template',
        'delete_template',
      ]),
    );
    for (const tool of constructiveDbTools) {
      expect(typeof tool.execute).toBe('function');
      expect(tool.parameters).toBeDefined();
    }
  });
});
