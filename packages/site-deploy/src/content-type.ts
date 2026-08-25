/**
 * Extension → MIME mapping for static builds.
 *
 * Deliberately small: it covers what a site generator emits. Anything else
 * falls back to `application/octet-stream` rather than being guessed — the
 * manifest's `content_type` is what the edge serves verbatim.
 */

export const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

const CONTENT_TYPES: Record<string, string> = {
  avif: 'image/avif',
  css: 'text/css; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  eot: 'application/vnd.ms-fontobject',
  gif: 'image/gif',
  htm: 'text/html; charset=utf-8',
  html: 'text/html; charset=utf-8',
  ico: 'image/x-icon',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  js: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  map: 'application/json; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  otf: 'font/otf',
  pdf: 'application/pdf',
  png: 'image/png',
  svg: 'image/svg+xml',
  ttf: 'font/ttf',
  txt: 'text/plain; charset=utf-8',
  wasm: 'application/wasm',
  webm: 'video/webm',
  webmanifest: 'application/manifest+json',
  webp: 'image/webp',
  woff: 'font/woff',
  woff2: 'font/woff2',
  xml: 'application/xml',
  yaml: 'text/yaml; charset=utf-8',
  yml: 'text/yaml; charset=utf-8',
  zip: 'application/zip',
};

/**
 * Resolve the content type of a logical path.
 *
 * @param path - Logical path (`assets/app.js`)
 * @param overrides - Extra or overriding mappings, keyed without the dot
 */
export function contentTypeFor(
  path: string,
  overrides?: Record<string, string>,
): string {
  const base = path.slice(path.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return DEFAULT_CONTENT_TYPE;
  const ext = base.slice(dot + 1).toLowerCase();
  return overrides?.[ext] ?? CONTENT_TYPES[ext] ?? DEFAULT_CONTENT_TYPE;
}
