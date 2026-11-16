/**
 * The Ollama dialect of an embed request.
 *
 * Clients carry image bytes as a base64 `data:` url. Ollama's `/api/embed`
 * takes an image as `{ image: <base64> }` and embeds a `data:` url string as
 * text, so the url must change shape on the way through or the caller gets a
 * well-formed vector of the wrong thing.
 */

import { transformEmbedRequest, transformEmbedResponse } from '../src/transforms';
import type { ResolvedProvider } from '../src/types';

const ollama: ResolvedProvider = { type: 'ollama', baseUrl: 'http://ollama.test:11434' };
const openai: ResolvedProvider = { type: 'openai', baseUrl: 'https://api.openai.test' };

const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const dataUrl = `data:image/png;base64,${base64}`;

describe('transformEmbedRequest for ollama', () => {
  it('sends a data-url string as an image', () => {
    const body = transformEmbedRequest(ollama, { model: 'embeddinggemma', input: dataUrl });

    expect(body).toEqual({ model: 'embeddinggemma', input: { image: base64 } });
  });

  it('sends each data-url array element as an image and leaves text alone', () => {
    const body = transformEmbedRequest(ollama, {
      model: 'embeddinggemma',
      input: [dataUrl, 'a red square', `data:image/jpeg;base64,${base64}`]
    });

    expect(body.input).toEqual([{ image: base64 }, 'a red square', { image: base64 }]);
  });

  it('leaves plain text untouched', () => {
    expect(transformEmbedRequest(ollama, { model: 'nomic-embed-text', input: 'hello' }).input).toBe('hello');
    expect(transformEmbedRequest(ollama, { model: 'nomic-embed-text', input: ['a', 'b'] }).input).toEqual(['a', 'b']);
  });

  it('leaves text that merely mentions a data url untouched', () => {
    const text = `the logo is ${dataUrl}`;

    expect(transformEmbedRequest(ollama, { input: text }).input).toBe(text);
    expect(transformEmbedRequest(ollama, { input: 'data:text/plain;base64,aGVsbG8=' }).input).toBe(
      'data:text/plain;base64,aGVsbG8='
    );
  });

  it('passes an input already in the image shape through', () => {
    const body = transformEmbedRequest(ollama, { input: [{ image: base64 }] });

    expect(body.input).toEqual([{ image: base64 }]);
  });

  it('passes dimensions through when the request carries it', () => {
    const body = transformEmbedRequest(ollama, { model: 'embeddinggemma', input: dataUrl, dimensions: 512 });

    expect(body).toEqual({ model: 'embeddinggemma', input: { image: base64 }, dimensions: 512 });
  });

  it('sends no dimensions when the request carries none', () => {
    expect(transformEmbedRequest(ollama, { input: 'hello' })).toEqual({ model: 'nomic-embed-text', input: 'hello' });
  });
});

describe('transformEmbedRequest for an OpenAI-compatible provider', () => {
  it('forwards the body as it came', () => {
    const body = transformEmbedRequest(openai, { model: 'text-embedding-3-small', input: [dataUrl, 'text'], dimensions: 512 });

    expect(body).toEqual({ model: 'text-embedding-3-small', input: [dataUrl, 'text'], dimensions: 512 });
  });
});

describe('image data urls ollama must not embed as text', () => {
  it.each([
    ['a media type with parameters', `data:image/svg+xml;charset=utf-8;base64,${base64}`],
    ['an uppercase encoding', `data:image/png;BASE64,${base64}`],
    ['an uppercase scheme and type', `DATA:IMAGE/PNG;base64,${base64}`]
  ])('sends %s as an image', (_name, url) => {
    expect(transformEmbedRequest(ollama, { input: url }).input).toEqual({ image: base64 });
    expect(transformEmbedRequest(ollama, { input: [url, 'a caption'] }).input).toEqual([{ image: base64 }, 'a caption']);
  });

  it('leaves text that mentions an image data url, with parameters or not, as text', () => {
    const text = `see data:image/svg+xml;charset=utf-8;base64,${base64}`;
    expect(transformEmbedRequest(ollama, { input: text }).input).toBe(text);
  });
});

describe('transformEmbedResponse for ollama', () => {
  it('maps embeddings to the openai list shape', () => {
    const { body, usage } = transformEmbedResponse({ embeddings: [[0.1, 0.2], [0.3, 0.4]], prompt_eval_count: 7 }, ollama);
    expect(body.data).toEqual([
      { object: 'embedding', embedding: [0.1, 0.2], index: 0 },
      { object: 'embedding', embedding: [0.3, 0.4], index: 1 }
    ]);
    expect(usage.prompt_tokens).toBe(7);
  });

  it('maps the single `embedding` of the older endpoint', () => {
    const { body } = transformEmbedResponse({ embedding: [0.1, 0.2] }, ollama);
    expect(body.data).toEqual([{ object: 'embedding', embedding: [0.1, 0.2], index: 0 }]);
  });

  it.each([
    ['no embeddings field', {}],
    ['an empty embeddings list', { embeddings: [] }],
    ['an empty vector', { embeddings: [[]] }],
    ['an error body', { error: 'model does not support embeddings' }]
  ])('throws on %s instead of answering one empty embedding', (_name, data) => {
    expect(() => transformEmbedResponse(data, ollama)).toThrow(/no embedding/);
  });
});
