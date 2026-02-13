process.env.LOG_SCOPE = 'graphile-test';

import gql from 'graphql-tag';
import { GraphQLString } from 'graphql';
import { join } from 'path';
import { seed } from 'pgsql-test';
import type { PgTestClient } from 'pgsql-test/test-client';

import { getConnections } from '../src/get-connections';
import type { GraphQLQueryFn } from '../src/types';
import { IntrospectionQuery } from '../test-utils/queries';

const schemas = ['app_public'];
const sql = (f: string) => join(__dirname, '/../sql', f);

// V5 plugin that adds a custom field to the root query
const TestPlugin: GraphileConfig.Plugin = {
  name: 'TestPlugin',
  version: '1.0.0',
  schema: {
    hooks: {
      GraphQLObjectType_fields(fields, build, context) {
        const { Self } = context;
        if (Self.name !== 'Query') return fields;
        return build.extend(fields, {
          testPluginField: {
            type: GraphQLString,
            resolve: () => 'test-plugin-value'
          }
        });
      }
    }
  }
};

// Another V5 plugin that adds a different field
const AnotherTestPlugin: GraphileConfig.Plugin = {
  name: 'AnotherTestPlugin',
  version: '1.0.0',
  schema: {
    hooks: {
      GraphQLObjectType_fields(fields, build, context) {
        const { Self } = context;
        if (Self.name !== 'Query') return fields;
        return build.extend(fields, {
          anotherTestField: {
            type: GraphQLString,
            resolve: () => 'another-test-value'
          }
        });
      }
    }
  }
};

describe('graphile-test with plugins', () => {
  describe('appendPlugins', () => {
    let teardown: () => Promise<void>;
    let query: GraphQLQueryFn;
    let db: PgTestClient;

    beforeAll(async () => {
      const connections = await getConnections(
        {
          useRoot: true,
          schemas,
          authRole: 'postgres',
          preset: {
            plugins: [TestPlugin]
          }
        },
        [
          seed.sqlfile([
            sql('test.sql')
          ])
        ]
      );

      ({ query, db, teardown } = connections);
    });

    beforeEach(() => db.beforeEach());
    afterEach(() => db.afterEach());
    afterAll(() => teardown());

    it('should add custom field from plugin to root query', async () => {
      const TEST_QUERY = gql`
        query {
          testPluginField
        }
      `;

      const res = await query(TEST_QUERY);
      expect(res.data?.testPluginField).toBe('test-plugin-value');
      expect(res.errors).toBeUndefined();
    });

    it('should include plugin field in introspection', async () => {
      const res = await query(IntrospectionQuery);
      expect(res.data).not.toBeNull();
      expect(res.data).not.toBeUndefined();
      expect(res.errors).toBeUndefined();

      const queryTypeName = res.data?.__schema?.queryType?.name;
      expect(queryTypeName).toBe('Query');

      // Find the Query type in the types array
      const types = res.data?.__schema?.types || [];
      const queryType = types.find((t: any) => t.name === queryTypeName);
      expect(queryType).not.toBeNull();
      expect(queryType).not.toBeUndefined();
      expect(queryType?.name).toBe('Query');
      expect(Array.isArray(queryType?.fields)).toBe(true);

      const fields = queryType?.fields || [];
      const testField = fields.find((f: any) => f.name === 'testPluginField');
      expect(testField).not.toBeNull();
      expect(testField).not.toBeUndefined();
      expect(testField?.name).toBe('testPluginField');

      // Handle nested type references
      const typeName = testField.type?.name ||
                      testField.type?.ofType?.name ||
                      testField.type?.ofType?.ofType?.name;
      expect(typeName).toBe('String');
    });
  });

  describe('multiple appendPlugins', () => {
    let teardown: () => Promise<void>;
    let query: GraphQLQueryFn;
    let db: PgTestClient;

    beforeAll(async () => {
      const connections = await getConnections(
        {
          useRoot: true,
          schemas,
          authRole: 'postgres',
          preset: {
            plugins: [TestPlugin, AnotherTestPlugin]
          }
        },
        [
          seed.sqlfile([
            sql('test.sql')
          ])
        ]
      );

      ({ query, db, teardown } = connections);
    });

    beforeEach(() => db.beforeEach());
    afterEach(() => db.afterEach());
    afterAll(() => teardown());

    it('should add multiple custom fields from multiple plugins', async () => {
      const TEST_QUERY = gql`
        query {
          testPluginField
          anotherTestField
        }
      `;

      const res = await query(TEST_QUERY);
      expect(res.data?.testPluginField).toBe('test-plugin-value');
      expect(res.data?.anotherTestField).toBe('another-test-value');
      expect(res.errors).toBeUndefined();
    });
  });

  describe('graphileBuildOptions', () => {
    let teardown: () => Promise<void>;
    let query: GraphQLQueryFn;
    let db: PgTestClient;

    beforeAll(async () => {
      const connections = await getConnections(
        {
          useRoot: true,
          schemas,
          authRole: 'postgres',
          preset: {
            plugins: [TestPlugin],
            schema: {
              // Test that we can pass schema options via preset
              pgOmitListSuffix: false
            }
          }
        },
        [
          seed.sqlfile([
            sql('test.sql')
          ])
        ]
      );

      ({ query, db, teardown } = connections);
    });

    beforeEach(() => db.beforeEach());
    afterEach(() => db.afterEach());
    afterAll(() => teardown());

    it('should work with graphileBuildOptions', async () => {
      const TEST_QUERY = gql`
        query {
          testPluginField
        }
      `;

      const res = await query(TEST_QUERY);
      expect(res.data?.testPluginField).toBe('test-plugin-value');
      expect(res.errors).toBeUndefined();
    });
  });

  describe('overrideSettings', () => {
    let teardown: () => Promise<void>;
    let query: GraphQLQueryFn;
    let db: PgTestClient;

    beforeAll(async () => {
      const connections = await getConnections(
        {
          useRoot: true,
          schemas,
          authRole: 'postgres',
          preset: {
            plugins: [TestPlugin]
          }
        },
        [
          seed.sqlfile([
            sql('test.sql')
          ])
        ]
      );

      ({ query, db, teardown } = connections);
    });

    beforeEach(() => db.beforeEach());
    afterEach(() => db.afterEach());
    afterAll(() => teardown());

    it('should work with overrideSettings', async () => {
      const TEST_QUERY = gql`
        query {
          testPluginField
        }
      `;

      const res = await query(TEST_QUERY);
      expect(res.data?.testPluginField).toBe('test-plugin-value');
      expect(res.errors).toBeUndefined();
    });
  });

  describe('combined graphile options', () => {
    let teardown: () => Promise<void>;
    let query: GraphQLQueryFn;
    let db: PgTestClient;

    beforeAll(async () => {
      const connections = await getConnections(
        {
          useRoot: true,
          schemas,
          authRole: 'postgres',
          preset: {
            plugins: [TestPlugin, AnotherTestPlugin],
            schema: {
              pgOmitListSuffix: false
            }
          }
        },
        [
          seed.sqlfile([
            sql('test.sql')
          ])
        ]
      );

      ({ query, db, teardown } = connections);
    });

    beforeEach(() => db.beforeEach());
    afterEach(() => db.afterEach());
    afterAll(() => teardown());

    it('should work with all graphile options combined', async () => {
      const TEST_QUERY = gql`
        query {
          testPluginField
          anotherTestField
        }
      `;

      const res = await query(TEST_QUERY);
      expect(res.data?.testPluginField).toBe('test-plugin-value');
      expect(res.data?.anotherTestField).toBe('another-test-value');
      expect(res.errors).toBeUndefined();
    });
  });
});
