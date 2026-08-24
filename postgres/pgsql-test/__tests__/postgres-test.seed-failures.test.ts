process.env.LOG_SCOPE = 'pgsql-test';

import { seed } from '../src';
import { getConnections } from '../src/connect';

jest.setTimeout(30000);

it('fails the harness when a seed adapter throws', async () => {
  await expect(
    getConnections({}, [
      seed.fn(async () => {
        throw new Error('DELIBERATE_SEED_FAILURE');
      })
    ])
  ).rejects.toThrow('DELIBERATE_SEED_FAILURE');
});

it('fails the harness when seed SQL is invalid', async () => {
  await expect(
    getConnections({}, [
      seed.fn(async ({ pg }) => {
        await pg.query('SELECT * FROM a_relation_that_does_not_exist');
      })
    ])
  ).rejects.toThrow(/a_relation_that_does_not_exist/);
});
