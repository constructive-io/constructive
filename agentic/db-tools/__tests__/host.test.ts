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

  it('configureHost + getHost round-trips', async () => {
    const host = {
      account: () => ({ userId: 'u1', accessToken: 't1' }),
      backendConfig: () => ({ apiEndpoint: 'http://api.localhost:3000/graphql' }),
    };
    configureHost(host);
    expect(getHost()).toBe(host);
    expect((await getHost().account())?.userId).toBe('u1');
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
  it('is the 25 db tools, harness-neutral', () => {
    expect(constructiveDbTools.map((tool) => tool.name)).toEqual([
      'provision_database',
      'replace_database',
      'describe_schema',
      'list_templates',
      'provision_blueprint',
      'add_relation',
      'delete_table',
      'create_field',
      'update_field',
      'retype_field',
      'delete_field',
      'add_policies',
      'apply_template',
      'create_template',
      'update_template',
      'delete_template',
      'add_records',
      'list_entity_types',
      'create_entity_type',
      'delete_entity_type',
      'create_api_key',
      'run_codegen',
      'explain_access',
      'set_access',
      'describe_policy_type',
    ]);
    for (const tool of constructiveDbTools) {
      expect(typeof tool.execute).toBe('function');
      expect(tool.parameters).toBeDefined();
    }
  });
});
