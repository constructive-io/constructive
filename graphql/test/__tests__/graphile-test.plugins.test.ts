process.env.LOG_SCOPE = 'graphile-test';

import type { GraphileConfig } from 'graphile-config';
import gql from 'graphql-tag';
import { GraphQLString } from 'graphql';
import { join } from 'path';
import { seed } from 'pgsql-test';
import type { PgTestClient } from 'pgsql-test/test-client';

import { getConnections } from '../src/get-connections';
import type { GraphQLQueryFn } from 'graphile-test';
import { IntrospectionQuery } from '../test-utils/queries';

const schemas = ['app_public'];
const sql = (f: string) => join(__dirname, '/../sql', f);

const TestPlugin: GraphileConfig.Plugin = {
  name: 'TestPlugin',
  version: '1.0.0',
  schema: {
    hooks: {
      GraphQLObjectType_fields(fields, build, context) {
        const { Self } = context;
        if (Self.name !== 'Query') return fields;

        return build.extend(
          fields,
          {
            testPluginField: {
              type: GraphQLString,
              resolve() {
                return 'test-plugin-value';
              },
            },
          },
          'Adding testPluginField to Query'
        );
      },
    },
  },
};

const AnotherTestPlugin: GraphileConfig.Plugin = {
  name: 'AnotherTestPlugin',
  version: '1.0.0',
  schema: {
    hooks: {
      GraphQLObjectType_fields(fields, build, context) {
        const { Self } = context;
        if (Self.name !== 'Query') return fields;

        return build.extend(
          fields,
          {
            anotherTestField: {
              type: GraphQLString,
              resolve() {
                return 'another-test-value';
              },
            },
          },
          'Adding anotherTestField to Query'
        );
      },
    },
  },
};

describe('graphile-test with plugins', () => {
  describe('preset with plugins', () => {
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
          },
        },
        [seed.sqlfile([sql('test.sql')])]
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

      const types = res.data?.__schema?.types || [];
      const queryType = types.find((t: { name: string }) => t.name === queryTypeName);
      expect(queryType).not.toBeNull();
      expect(queryType).not.toBeUndefined();
      expect(queryType?.name).toBe('Query');
      expect(Array.isArray(queryType?.fields)).toBe(true);

      const fields = queryType?.fields || [];
      const testField = fields.find((f: { name: string }) => f.name === 'testPluginField');
      expect(testField).not.toBeNull();
      expect(testField).not.toBeUndefined();
      expect(testField?.name).toBe('testPluginField');

      const typeName =
        testField.type?.name || testField.type?.ofType?.name || testField.type?.ofType?.ofType?.name;
      expect(typeName).toBe('String');
    });
  });

  describe('multiple plugins in preset', () => {
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
          },
        },
        [seed.sqlfile([sql('test.sql')])]
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

  describe('preset with schema options', () => {
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
              pgOmitListSuffix: false,
            },
          },
        },
        [seed.sqlfile([sql('test.sql')])]
      );

      ({ query, db, teardown } = connections);
    });

    beforeEach(() => db.beforeEach());
    afterEach(() => db.afterEach());
    afterAll(() => teardown());

    it('should work with schema options', async () => {
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

  describe('combined preset options', () => {
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
              pgOmitListSuffix: false,
            },
          },
        },
        [seed.sqlfile([sql('test.sql')])]
      );

      ({ query, db, teardown } = connections);
    });

    beforeEach(() => db.beforeEach());
    afterEach(() => db.afterEach());
    afterAll(() => teardown());

    it('should work with all preset options combined', async () => {
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

