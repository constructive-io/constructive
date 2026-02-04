import '../test-utils/env';
import { GraphQLQueryFn, getConnections, seed, snapshot } from 'graphile-test';
import { join } from 'path';
import type { PgTestClient } from 'pgsql-test/test-client';

import { PgSimpleInflector } from '../src';
import { IntrospectionQuery } from '../test-utils/queries';

const SCHEMA = 'app_public';
const sql = (file: string) => join(__dirname, '../sql', file);

// Helper function to create a test case with its own database setup
function createTestCase(
  testName: string,
  sqlFile: string,
  expectedTypes: {
    orderBy?: string[];
    connection?: string[];
    edge?: string[];
    queryField?: string;
  }
) {
  describe(testName, () => {
    let teardown: () => Promise<void>;
    let query: GraphQLQueryFn;
    let db: PgTestClient;

    beforeAll(async () => {
      const connections = await getConnections(
        {
          schemas: [SCHEMA],
          authRole: 'authenticated',
          preset: {
            plugins: [PgSimpleInflector]
          }
        },
        [
          seed.sqlfile([
            sql(sqlFile)
          ])
        ]
      );

      ({ db, query, teardown } = connections);
    });

    beforeEach(() => db.beforeEach());
    beforeEach(async () => {
      db.setContext({ role: 'authenticated' });
    });
    afterEach(() => db.afterEach());
    afterAll(async () => {
      await teardown();
    });

    it(`should correctly handle ${testName}`, async () => {
      const data = await query(IntrospectionQuery);
      
      // Use snapshot to verify the entire schema structure
      expect(snapshot(data)).toMatchSnapshot(`${testName.replace(/\s+/g, '-').toLowerCase()}`);
    });
  });
}

describe('Inflection Special Cases', () => {
  describe('Singular Table Names', () => {
    // Test case 1: regimen (singular table name)
    createTestCase(
      'regimen table',
      'test-regimen.sql',
      {
        orderBy: ['RegimensOrderBy', 'RegimenOrderBy'],
        connection: ['RegimensConnection', 'RegimenConnection'],
        edge: ['RegimensEdge', 'RegimenEdge'],
        queryField: 'regimens'
      }
    );

    // Test case 2: child (singular table name)
    createTestCase(
      'child table',
      'test-child.sql',
      {
        orderBy: ['ChildrenOrderBy', 'ChildOrderBy'],
        connection: ['ChildrenConnection', 'ChildConnection'],
        edge: ['ChildrenEdge', 'ChildEdge'],
        queryField: 'children'
      }
    );

    // Test case 3: man (singular table name)
    createTestCase(
      'man table',
      'test-man.sql',
      {
        orderBy: ['MenOrderBy', 'ManOrderBy'],
        connection: ['MenConnection', 'ManConnection'],
        edge: ['MenEdge', 'ManEdge'],
        queryField: 'men'
      }
    );

    // Test case 4: user_login (singular compound table name)
    createTestCase(
      'user_login table',
      'test-user_login.sql',
      {
        orderBy: ['UserLoginsOrderBy', 'UserLoginOrderBy'],
        connection: ['UserLoginsConnection', 'UserLoginConnection'],
        edge: ['UserLoginsEdge', 'UserLoginEdge'],
        queryField: 'userLogins'
      }
    );
  });

  describe('Plural Table Names', () => {
    // Test case 1: regimens (plural table name)
    createTestCase(
      'regimens table',
      'test-regimens.sql',
      {
        orderBy: ['RegimensOrderBy', 'RegimenOrderBy'],
        connection: ['RegimensConnection', 'RegimenConnection'],
        edge: ['RegimensEdge', 'RegimenEdge'],
        queryField: 'regimens'
      }
    );

    // Test case 2: children (plural table name)
    createTestCase(
      'children table',
      'test-children.sql',
      {
        orderBy: ['ChildrenOrderBy', 'ChildOrderBy'],
        connection: ['ChildrenConnection', 'ChildConnection'],
        edge: ['ChildrenEdge', 'ChildEdge'],
        queryField: 'children'
      }
    );

    // Test case 3: men (plural table name)
    createTestCase(
      'men table',
      'test-men.sql',
      {
        orderBy: ['MenOrderBy', 'ManOrderBy'],
        connection: ['MenConnection', 'ManConnection'],
        edge: ['MenEdge', 'ManEdge'],
        queryField: 'men'
      }
    );

    // Test case 4: user_logins (plural compound table name)
    createTestCase(
      'user_logins table',
      'test-user_logins.sql',
      {
        orderBy: ['UserLoginsOrderBy', 'UserLoginOrderBy'],
        connection: ['UserLoginsConnection', 'UserLoginConnection'],
        edge: ['UserLoginsEdge', 'UserLoginEdge'],
        queryField: 'userLogins'
      }
    );
  });

  describe('Compound Table Names', () => {
    // Test case 1: user_regimen (singular compound table name)
    createTestCase(
      'user_regimen table',
      'test-user_regimen.sql',
      {
        orderBy: ['UserRegimensOrderBy', 'UserRegimenOrderBy'],
        connection: ['UserRegimensConnection', 'UserRegimenConnection'],
        edge: ['UserRegimensEdge', 'UserRegimenEdge'],
        queryField: 'userRegimens'
      }
    );

    // Test case 2: user_regimens (plural compound table name)
    createTestCase(
      'user_regimens table',
      'test-user_regimens.sql',
      {
        orderBy: ['UserRegimensOrderBy', 'UserRegimenOrderBy'],
        connection: ['UserRegimensConnection', 'UserRegimenConnection'],
        edge: ['UserRegimensEdge', 'UserRegimenEdge'],
        queryField: 'userRegimens'
      }
    );
  });
});

