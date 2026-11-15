/**
 * The Ollama dialect of an embed request.
 *
 * Clients carry image bytes as a base64 `data:` url. Ollama's `/api/embed`
 * takes an image as `{ image: <base64> }` and embeds a `data:` url string as
 * text, so the url must change shape on the way through or the caller gets a
 * well-formed vector of the wrong thing.
 */

import { transformEmbedRequest } from '../src/transforms';
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
