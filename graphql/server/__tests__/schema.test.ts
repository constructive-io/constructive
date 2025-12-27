process.env.LOG_SCOPE = 'graphile-test';

import { join } from 'path';
import express from 'express';
import { buildSchema, GraphQLInputObjectType, GraphQLObjectType } from 'graphql';
import { postgraphile } from 'postgraphile';
// @ts-ignore
import { getGraphileSettings } from 'graphile-settings';
import { getPgPool, teardownPgPools } from 'pg-cache';

import { buildSchemaSDL, fetchEndpointSchemaSDL } from '../src/schema';
import { seed, getConnections } from 'graphile-test';

jest.setTimeout(30000);

const schemas = ['app_public'];
const sql = (f: string) => join(__dirname, '../../test/sql', f);

let db: any;
let teardown: () => Promise<void>;
let server: import('http').Server | null = null;

const expectSchemaDslBasics = (sdl: string) => {
  const schema = buildSchema(sdl);

  const queryType = schema.getType('Query') as GraphQLObjectType;
  expect(queryType).toBeInstanceOf(GraphQLObjectType);
  const queryFields = queryType.getFields();
  expect(Object.keys(queryFields)).toEqual(expect.arrayContaining(['users', 'user', 'userByUsername']));

  const userType = schema.getType('User') as GraphQLObjectType;
  expect(userType).toBeInstanceOf(GraphQLObjectType);
  const userFields = userType.getFields();
  expect(userFields.id.type.toString()).toBe('Int!');
  expect(userFields.username.type.toString()).toBe('String!');

  const mutationType = schema.getType('Mutation') as GraphQLObjectType;
  expect(mutationType).toBeInstanceOf(GraphQLObjectType);
  const mutationFields = mutationType.getFields();
  expect(Object.keys(mutationFields)).toEqual(expect.arrayContaining(['createUser', 'updateUser', 'deleteUser']));

  const createUserInput = schema.getType('CreateUserInput') as GraphQLInputObjectType;
  expect(createUserInput).toBeInstanceOf(GraphQLInputObjectType);
  expect(createUserInput.getFields().user.type.toString()).toBe('UserInput!');

  const userInput = schema.getType('UserInput') as GraphQLInputObjectType;
  expect(userInput).toBeInstanceOf(GraphQLInputObjectType);
  expect(userInput.getFields().username.type.toString()).toBe('String!');
};

beforeAll(async () => {
  const connections = await getConnections(
    { schemas },
    [
      seed.sqlfile([
        sql('test.sql'),
        sql('grants.sql')
      ])
    ]
  );
  ({ db, teardown } = connections);
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = null;
  }
  await teardownPgPools();
  await teardown();
});

beforeEach(async () => {
  await db.beforeEach();
});

afterEach(async () => {
  await db.afterEach();
});

it('buildSchemaSDL returns a valid GraphQL SDL string', async () => {
  const sdl = await buildSchemaSDL({
    database: db.config.database,
    schemas
  });
  expect(typeof sdl).toBe('string');
  expect(sdl.length).toBeGreaterThan(100);
  expect(sdl).toContain('type Query');
});

it('fetchEndpointSchemaSDL returns the same SDL as buildSchemaSDL for a running endpoint', async () => {
  // Start a minimal PostGraphile server backed by the same test database
  const app = express();

  const options = getGraphileSettings({ graphile: { schema: schemas } } as any);
  const pool = getPgPool({
    database: db.config.database,
    user: db.config.user,
    password: db.config.password,
    host: db.config.host,
    port: db.config.port,
  });

  app.use(postgraphile(pool, schemas, options));

  await new Promise<void>((resolve) => {
    server = app.listen(54321, '127.0.0.1', () => resolve());
  });

  const endpoint = 'http://127.0.0.1:54321/graphql';

  const sdlDirect = await buildSchemaSDL({
    database: db.config.database,
    schemas
  });
  const sdlViaHTTP = await fetchEndpointSchemaSDL(endpoint);

  expect(typeof sdlViaHTTP).toBe('string');
  expect(sdlViaHTTP).toContain('type Query');
  expectSchemaDslBasics(sdlDirect);

  // The SDL generated directly from the database should match the one from HTTP introspection
  expect(sdlViaHTTP).toBe(sdlDirect);
});
