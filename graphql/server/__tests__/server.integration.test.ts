/**
 * Server Integration Tests using graphql-server-test
 *
 * These tests use self-contained seed SQL files to set up an isolated
 * temporary database. No manual setup required - just run the tests.
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=server.integration
 */

import path from 'path';
import { getConnections, seed } from 'graphql-server-test';
import type { ServerInfo } from 'graphql-server-test';
import type supertest from 'supertest';

jest.setTimeout(30000);

const sql = (file: string) => path.join(__dirname, '..', '__fixtures__', 'seed', file);
const schemas = ['simple-pets-public', 'simple-pets-pets-public'];

describe('Server Integration Tests', () => {
  let server: ServerInfo;
  let request: supertest.Agent;
  let teardown: () => Promise<void>;

  beforeAll(async () => {
    ({ server, request, teardown } = await getConnections(
      {
        schemas,
        authRole: 'anonymous',
        server: {
          api: {
            enableServicesApi: false
          }
        }
      },
      [
        seed.sqlfile([
          sql('setup.sql'),
          sql('schema.sql'),
          sql('grants.sql'),
          sql('test-data.sql')
        ])
      ]
    ));
  });

  afterAll(async () => {
    await teardown();
  });

  describe('Query Tests', () => {
    it('should query all animals', async () => {
      const res = await request
        .post('/graphql')
        .send({ query: '{ animals { nodes { id name species } } }' });

      expect(res.status).toBe(200);
      expect(res.body.data.animals.nodes).toHaveLength(5);
    });

    it('should query animals with filter', async () => {
      const res = await request
        .post('/graphql')
        .send({
          query: `{ animals(filter: { species: { equalTo: "Dog" } }) { nodes { name species } } }`
        });

      expect(res.status).toBe(200);
      expect(res.body.data.animals.nodes).toHaveLength(2);
      expect(res.body.data.animals.nodes.every((a: any) => a.species === 'Dog')).toBe(true);
    });

    it('should query with variables', async () => {
      const res = await request
        .post('/graphql')
        .send({
          query: `query GetBySpecies($species: String!) {
            animals(filter: { species: { equalTo: $species } }) {
              nodes { name }
            }
          }`,
          variables: { species: 'Cat' }
        });

      expect(res.status).toBe(200);
      expect(res.body.data.animals.nodes).toHaveLength(2);
    });
  });

  describe('Mutation Tests', () => {
    it('should create and delete an animal', async () => {
      // Create
      const createRes = await request
        .post('/graphql')
        .send({
          query: `mutation($input: CreateAnimalInput!) {
            createAnimal(input: $input) {
              animal { id name species }
            }
          }`,
          variables: {
            input: { animal: { name: 'TestHamster', species: 'Hamster' } }
          }
        });

      expect(createRes.status).toBe(200);
      expect(createRes.body.data.createAnimal.animal.name).toBe('TestHamster');

      const createdId = createRes.body.data.createAnimal.animal.id;

      // Delete
      const deleteRes = await request
        .post('/graphql')
        .send({
          query: `mutation($input: DeleteAnimalInput!) {
            deleteAnimal(input: $input) { deletedAnimalNodeId }
          }`,
          variables: { input: { id: createdId } }
        });

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.deleteAnimal.deletedAnimalNodeId).toBeDefined();
    });

    it('should update an animal', async () => {
      // Get first animal
      const queryRes = await request
        .post('/graphql')
        .send({ query: '{ animals(first: 1) { nodes { id name } } }' });

      const animal = queryRes.body.data.animals.nodes[0];
      const originalName = animal.name;

      // Update
      const updateRes = await request
        .post('/graphql')
        .send({
          query: `mutation($input: UpdateAnimalInput!) {
            updateAnimal(input: $input) {
              animal { id name }
            }
          }`,
          variables: {
            input: { id: animal.id, patch: { name: 'TempName' } }
          }
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.updateAnimal.animal.name).toBe('TempName');

      // Restore
      await request
        .post('/graphql')
        .send({
          query: `mutation($input: UpdateAnimalInput!) {
            updateAnimal(input: $input) { animal { id } }
          }`,
          variables: {
            input: { id: animal.id, patch: { name: originalName } }
          }
        });
    });
  });
});
