import assert from 'node:assert/strict';

import { namedPlaneAnswers } from '../../src/pipeline/named-plane';

const API = 'http://api.localhost/graphql';

describe('namedPlaneAnswers', () => {
  it('asks the api-<name> host of the configured backend', async () => {
    let asked = '';
    await namedPlaneAnswers(API, 'crm', async (url) => {
      asked = url;
      return new Response('{}', { status: 200 });
    });
    assert.equal(asked, 'http://api-crm.localhost/graphql');
  });

  it('is false when the named host does not exist', async () => {
    assert.equal(
      await namedPlaneAnswers(API, 'crm', async () => new Response('', { status: 404 })),
      false,
    );
  });

  it('is true when the host answers, even without a token', async () => {
    assert.equal(
      await namedPlaneAnswers(API, 'crm', async () => new Response('', { status: 401 })),
      true,
    );
  });

  it('keeps adopting when the backend cannot be reached', async () => {
    const answers = await namedPlaneAnswers(API, 'crm', async () => {
      throw new TypeError('fetch failed');
    });
    assert.equal(answers, true);
  });
});
