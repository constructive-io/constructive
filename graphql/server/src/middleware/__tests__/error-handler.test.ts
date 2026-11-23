import { Logger } from '@pgpmjs/logger';
import express from 'express';
import supertest from 'supertest';

import { createAgenticRouter } from '../../agentic';
import { errorHandler } from '../error-handler';

const jsonLimit = 100 * 1024;
const validJson = '{"query":"{ __typename }"}';
const testBody = validJson.padEnd(jsonLimit);

function createTestApp() {
  const app = express();
  app.use(createAgenticRouter());
  app.post('/graphql', (req, res) => res.json({ data: req.body }));
  app.get('/internal-error', () => {
    throw new Error('Server failure');
  });
  app.use(errorHandler);
  return supertest(app);
}

describe('HTTP request body errors', () => {
  const request = createTestApp();

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('accepts valid GraphQL JSON at the Express body limit', async () => {
    const res = await request.post('/graphql').type('json').send(testBody);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { query: '{ __typename }' } });
  });

  it('returns a GraphQL 413 with the parser limit for an oversized JSON body', async () => {
    const res = await request.post('/graphql').type('json').send(testBody + ' ');
    expect(res.status).toBe(413);
    expect(res.body).toEqual({
      errors: [{
        message: 'The request body is too large.',
        extensions: { code: 'REQUEST_TOO_LARGE', class: 'public', http: 413, context: { limit: jsonLimit } }
      }]
    });
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 413 }));
    expect(Logger.prototype.error).not.toHaveBeenCalled();
  });

  it('returns a GraphQL 400 without reflecting malformed JSON in the response or log', async () => {
    const malformed = '{"query": "example", "value": invalid-private-input}';
    const res = await request.post('/graphql').type('json').send(malformed);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      errors: [{
        message: 'The request body contains invalid JSON.',
        extensions: { code: 'BAD_USER_INPUT', class: 'public', http: 400 }
      }]
    });
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(JSON.stringify(jest.mocked(Logger.prototype.warn).mock.calls)).not.toContain('invalid-private-input');
    expect(Logger.prototype.error).not.toHaveBeenCalled();
  });

  it('preserves a parser 415 for unsupported encoding with the REST JSON envelope', async () => {
    const res = await request.post('/v1/threads')
      .type('json')
      .set('Content-Encoding', 'unsupported')
      .send('{}');
    expect(res.status).toBe(415);
    expect(res.body).toEqual({
      error: { code: 'INVALID_REQUEST_BODY', message: 'Unsupported Media Type' }
    });
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 415 }));
  });

  it('still responds with HTTP 500 and logs unexpected errors at error level', async () => {
    const res = await request.get('/internal-error').accept('json');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(Logger.prototype.error).toHaveBeenCalled();
    expect(Logger.prototype.warn).not.toHaveBeenCalled();
  });
});
