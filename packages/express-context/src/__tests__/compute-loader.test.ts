import type { Pool } from 'pg';

import { computeLoader } from '../loaders/compute';

describe('compute control-plane loader', () => {
  afterEach(() => computeLoader.invalidate());

  it('loads API bindings through the control-plane tenant pool', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({
        rows: [{
          functions_schema_name: 'compute"schema',
          definitions_table_name: 'definitions',
          bindings_table_name: 'bindings',
          invocations_schema_name: 'invocations',
          invocations_table_name: 'jobs',
          invocations_entity_field: 'database_id'
        }]
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'binding-a',
          alias: 'summarize',
          config: { graphql: true },
          function_definition_id: 'definition-a',
          task_identifier: 'summarize-task',
          description: 'Summarize content',
          payload_args: [{ name: 'body', type: 'string' }]
        }]
      });
    const ctx = {
      routingPool: {} as Pool,
      tenantPool: { query } as unknown as Pool,
      databaseId: 'database-compute-loader-test',
      apiId: 'api-a',
      dbname: 'tenant_db'
    };

    const result = await computeLoader.resolve(ctx);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toContain('FROM "compute""schema"."bindings" b');
    expect(query.mock.calls[1][1]).toEqual(['api-a']);
    expect(result?.bindings).toEqual([{
      bindingId: 'binding-a',
      alias: 'summarize',
      config: { graphql: true },
      functionDefinitionId: 'definition-a',
      taskIdentifier: 'summarize-task',
      description: 'Summarize content',
      payloadArgs: [{ name: 'body', type: 'string' }],
      module: result?.modules[0]
    }]);
  });
});
