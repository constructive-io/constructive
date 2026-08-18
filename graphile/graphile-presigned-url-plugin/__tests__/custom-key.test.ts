/**
 * Unit tests for custom object-key validation.
 *
 * The rule being pinned is containment, not aesthetics: a key may look however a
 * build tool wants it to as long as it cannot escape the bucket's namespace or
 * mean something different to S3 than to the gateway serving it. A static export
 * puts its immutable assets under `_next/static/**`, so a leading underscore must
 * be accepted while the traversal guards stay in force.
 */

import { validateCustomKey } from '../src/custom-key';

describe('validateCustomKey', () => {
  it.each([
    '_next/static/chunks/main-abc123.js',
    '_next/static/css/app.css',
    '_headers',
    'index.html',
    'assets/img/logo.svg',
    'docs/v1.2.3/guide.pdf',
    'a',
    'my-file_name.v2.tar.gz',
  ])('accepts %s', (key) => {
    expect(validateCustomKey(key)).toBeNull();
  });

  it('accepts a key at the length limit and rejects one past it', () => {
    expect(validateCustomKey('a'.repeat(1024))).toBeNull();
    expect(validateCustomKey('a'.repeat(1025))).toMatch(/INVALID_KEY_LENGTH/);
  });

  it('rejects an empty key', () => {
    expect(validateCustomKey('')).toMatch(/INVALID_KEY_LENGTH/);
  });

  it.each(['../etc/passwd', 'assets/../../secret', '_next/../..'])(
    'rejects path traversal in %s',
    (key) => {
      expect(validateCustomKey(key)).toMatch(/path traversal/);
    },
  );

  it('rejects a leading slash', () => {
    expect(validateCustomKey('/_next/static/main.js')).toMatch(/leading slash/);
  });

  it('rejects NUL bytes', () => {
    expect(validateCustomKey('index.html\0.png')).toMatch(/null bytes/);
  });

  it.each([
    '-leading-hyphen.js',
    '.leading-dot.js',
    'has space.js',
    'has:colon.js',
    'has?query=1',
    'emoji-🚀.png',
  ])('rejects %s', (key) => {
    expect(validateCustomKey(key)).toMatch(/^INVALID_KEY:/);
  });
});
