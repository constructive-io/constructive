import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { getGraphQLEnvVars } from '../env';
import { getEnvOptions } from '../merge';

describe('GraphQL runtime PostgreSQL environment', () => {
  it('maps dedicated runtime credentials without changing control-plane pg', () => {
    const result = getGraphQLEnvVars({
      GRAPHQL_RUNTIME_PGUSER: 'graphql_runtime',
      GRAPHQL_RUNTIME_PGPASSWORD: 'runtime-secret',
    });

    expect(result.runtimePg).toEqual({
      user: 'graphql_runtime',
      password: 'runtime-secret',
    });
    expect(result.pg).toBeUndefined();
  });

  it('does not create a runtime override when both variables are absent', () => {
    expect(getGraphQLEnvVars({}).runtimePg).toBeUndefined();
  });

  it('merges static runtime config, env password, and exact route identity', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-runtime-pg-'));
    const identity = {
      databaseId: 'database-a',
      databaseName: 'tenant_a',
      apiId: 'api-a',
      schemas: ['tenant_a_public'],
      roles: ['anonymous', 'authenticated'],
    };
    fs.writeFileSync(
      path.join(cwd, 'pgpm.json'),
      JSON.stringify({
        runtimePg: {
          host: 'runtime.internal',
          database: 'tenant_a',
          user: 'tenant_runtime',
          password: 'config-secret',
        },
        runtimePgStaticIdentity: identity,
      })
    );

    try {
      const result = getEnvOptions({}, cwd, {
        GRAPHQL_RUNTIME_PGPASSWORD: 'env-secret',
      });
      expect(result.runtimePg).toMatchObject({
        host: 'runtime.internal',
        database: 'tenant_a',
        user: 'tenant_runtime',
        password: 'env-secret',
      });
      expect(result.runtimePgStaticIdentity).toEqual(identity);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});
