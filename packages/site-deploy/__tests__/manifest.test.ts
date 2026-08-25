import { contentTypeFor } from '../src/content-type';
import { buildManifest, casKey, hashBytes, manifestsEqual, normalizePath } from '../src/manifest';
import { DeployError } from '../src/types';

const bytes = (body: string) => new TextEncoder().encode(body);

/** echo -n "hello world" | sha256sum */
const HELLO_WORLD = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';

describe('hashBytes', () => {
  it('matches the sha256 the gateway resolves CAS keys with', () => {
    expect(hashBytes(bytes('hello world'))).toBe(HELLO_WORLD);
  });

  it('is stable for identical bytes', () => {
    expect(hashBytes(bytes('a'))).toBe(hashBytes(bytes('a')));
    expect(hashBytes(bytes('a'))).not.toBe(hashBytes(bytes('b')));
  });
});

describe('casKey', () => {
  it('produces the one key form the bucket stores bytes under', () => {
    expect(casKey(HELLO_WORLD)).toBe(`cas/sha256/${HELLO_WORLD}`);
  });
});

describe('normalizePath', () => {
  it.each([
    ['./index.html', 'index.html'],
    ['/index.html', 'index.html'],
    ['assets\\app.js', 'assets/app.js'],
    ['.well-known/security.txt', '.well-known/security.txt'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizePath(input)).toBe(expected);
  });

  it('rejects traversal rather than deploying outside the site root', () => {
    expect(() => normalizePath('../secrets.env')).toThrow(DeployError);
  });

  it('rejects logical paths that would shadow the byte namespace', () => {
    expect(() => normalizePath(`cas/sha256/${HELLO_WORLD}`)).toThrow(/byte namespace/);
  });
});

describe('contentTypeFor', () => {
  it('maps known static-build extensions', () => {
    expect(contentTypeFor('index.html')).toBe('text/html; charset=utf-8');
    expect(contentTypeFor('assets/app.js')).toBe('text/javascript; charset=utf-8');
  });

  it('falls back to octet-stream instead of guessing', () => {
    expect(contentTypeFor('data.unknownext')).toBe('application/octet-stream');
    expect(contentTypeFor('LICENSE')).toBe('application/octet-stream');
  });

  it('lets the caller override a mapping', () => {
    expect(contentTypeFor('a.js', { js: 'application/javascript' })).toBe(
      'application/javascript',
    );
  });
});

describe('buildManifest', () => {
  const files = [
    {
      path: 'index.html',
      key: casKey(HELLO_WORLD),
      hash: HELLO_WORLD,
      contentType: 'text/html; charset=utf-8',
      size: 11,
      bytes: bytes('hello world'),
    },
  ];

  it('derives counts and totals rather than trusting them', () => {
    const manifest = buildManifest(files);
    expect(manifest).toEqual({
      files: {
        'index.html': {
          hash: HELLO_WORLD,
          content_type: 'text/html; charset=utf-8',
          size: 11,
        },
      },
      file_count: 1,
      total_bytes: 11,
    });
  });

  it('refuses an empty manifest', () => {
    expect(() => buildManifest([])).toThrow(/empty manifest/);
  });

  it('refuses two files claiming the same logical path', () => {
    expect(() => buildManifest([...files, ...files])).toThrow(/Duplicate logical path/);
  });
});

describe('manifestsEqual', () => {
  const manifest = buildManifest(files());

  it('is true for the same tree', () => {
    expect(manifestsEqual(manifest, buildManifest(files()))).toBe(true);
  });

  it('is false when any byte changed', () => {
    const changed = files();
    changed[0].hash = 'f'.repeat(64);
    expect(manifestsEqual(manifest, buildManifest(changed))).toBe(false);
  });

  it('is false when a file was added', () => {
    const added = [
      ...files(),
      { ...files()[0], path: 'about.html' },
    ];
    expect(manifestsEqual(manifest, buildManifest(added))).toBe(false);
  });

  function files() {
    return [
      {
        path: 'index.html',
        key: casKey(HELLO_WORLD),
        hash: HELLO_WORLD,
        contentType: 'text/html; charset=utf-8',
        size: 11,
        bytes: bytes('hello world'),
      },
    ];
  }
});
