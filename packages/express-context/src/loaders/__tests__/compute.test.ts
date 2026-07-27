import type { Pool } from 'pg';

import { computeLoader } from '../compute';
import type { LoaderContext } from '../types';

function createContext(query: jest.Mock): LoaderContext {
  const tenantPool = { query } as unknown as Pool;

  return {
    servicesPool: { query: jest.fn() } as unknown as Pool,
    tenantPool,
    databaseId: 'hub-database-id',
    dbname: 'constructive',
  };
}

describe('computeLoader', () => {
  afterEach(() => {
    computeLoader.invalidate();
  });

  it('supports compute metadata before bindings and entity names were stored on module rows', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [
        {
          functions_schema_name: 'constructive_compute_public',
          definitions_table_name: 'function_definitions',
          bindings_table_name: 'function_api_bindings',
          invocations_schema_name: 'constructive_compute_public',
          invocations_table_name: 'function_invocations',
          invocations_entity_field: null,
        },
      ],
    });

    const config = await computeLoader.resolve(createContext(query));
    const sql = query.mock.calls[0][0] as string;

    expect(sql).toContain("to_jsonb(fm) ->> 'bindings_table_name'");
    expect(sql).toContain('legacy_bindings.name');
    expect(sql).toContain("to_jsonb(ivm) ->> 'entity_field'");
    expect(sql).not.toContain('fm.bindings_table_name');
    expect(sql).not.toContain('ivm.entity_field');
    expect(query).toHaveBeenCalledWith(sql, ['hub-database-id']);
    expect(config).toEqual({
      modules: [
        {
          schemaName: 'constructive_compute_public',
          definitionsTableName: 'function_definitions',
          bindingsTableName: 'function_api_bindings',
          invocationsSchemaName: 'constructive_compute_public',
          invocationsTableName: 'function_invocations',
          invocationsEntityField: null,
        },
      ],
    });
  });

  it('fails clearly when neither current nor legacy metadata resolves a bindings table', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [
        {
          functions_schema_name: 'compute_public',
          definitions_table_name: 'function_definitions',
          bindings_table_name: null,
          invocations_schema_name: 'compute_public',
          invocations_table_name: 'function_invocations',
          invocations_entity_field: null,
        },
      ],
    });

    await expect(computeLoader.resolve(createContext(query))).rejects.toThrow(
      'function bindings table missing for schema compute_public'
    );
  });
});
