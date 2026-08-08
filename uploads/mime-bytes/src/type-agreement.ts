/**
 * Agreement between the three things that claim to say what a file is.
 *
 * An upload arrives with up to three independent statements about its type:
 *
 *   * the **declared** MIME type — what the client says it is;
 *   * the **extension** on the filename — what the client says it is again, in a
 *     form the operating system and the browser act on;
 *   * the **magic bytes** — what it actually is.
 *
 * Only the third is evidence. The other two are the attack surface: a browser
 * that fetches `avatar.jpg` and receives HTML will happily run the script in it,
 * which is why `html-as-jpg.jpg` is a fixture in this repo rather than a
 * curiosity. So the rule is agreement, not precedence: when two statements
 * describe different kinds of file, the upload is rejected instead of being
 * silently relabelled.
 *
 * Deliberately conservative about what counts as disagreement, because a false
 * rejection is a broken upload:
 *
 *   * a statement that is absent or `application/octet-stream` says nothing, and
 *     cannot contradict anything;
 *   * text formats are indistinguishable by leading bytes — a `.csv`, a `.json`
 *     and an `.svg` are all "some text" — so text is compared as one family;
 *   * container formats really are the thing they contain: a `.docx` *is* a ZIP,
 *     an `.m4a` *is* an MP4 box stream. Those pairs are declared equivalent.
 */

import { getContentTypeByExtension } from './file-types-registry';
import { getExtension } from './utils/extensions';
import { normalizeMimeType, resolveMimeAlias } from './utils/mime-types';

/** Says nothing about the content, so it can never contradict anything. */
const UNKNOWN_MIME = 'application/octet-stream';

/**
 * Types whose bytes are text, and are therefore mutually indistinguishable to a
 * magic-byte sniff: it can tell text from binary, not JSON from CSV.
 */
const TEXT_LIKE = [
  'text/',
  'application/json',
  'application/ld+json',
  'application/xml',
  'application/xhtml+xml',
  'application/javascript',
  'application/ecmascript',
  'application/typescript',
  'application/x-httpd-php',
  'application/x-sh',
  'application/x-csh',
  'application/x-python',
  'application/x-ruby',
  'application/x-perl',
  'application/x-yaml',
  'application/yaml',
  'application/toml',
  'application/sql',
  'image/svg+xml',
];

/**
 * Formats that are physically another format: their leading bytes are the
 * container's, so a sniff naming the container is not a contradiction.
 *
 * Keyed by the container the bytes look like; the values are the specific types
 * that legitimately sit inside it.
 */
const CONTAINER_FAMILIES: Record<string, string[]> = {
  'application/zip': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'application/epub+zip',
    'application/java-archive',
    'application/vnd.android.package-archive',
    'application/x-xpinstall',
  ],
  'video/mp4': ['audio/mp4', 'audio/x-m4a', 'video/quicktime', 'video/x-m4v'],
  'audio/mp4': ['video/mp4', 'audio/x-m4a', 'video/x-m4v'],
  'video/quicktime': ['video/mp4'],
  'application/x-riff': ['audio/wav', 'audio/x-wav', 'video/avi', 'video/x-msvideo', 'image/webp'],
  'application/gzip': ['application/tar', 'application/x-gtar'],
};

function isTextLike(mime: string): boolean {
  return TEXT_LIKE.some((prefix) => mime === prefix || mime.startsWith(prefix));
}

/** A statement that carries no information about the content. */
function isSilent(mime: string | null | undefined): boolean {
  return !mime || mime === UNKNOWN_MIME;
}

function canonical(mime: string | null | undefined): string | null {
  if (!mime) return null;
  const normalized = resolveMimeAlias(normalizeMimeType(mime));
  return normalized || null;
}

function inSameContainerFamily(a: string, b: string): boolean {
  return (CONTAINER_FAMILIES[a]?.includes(b) ?? false) || (CONTAINER_FAMILIES[b]?.includes(a) ?? false);
}

/**
 * Whether two type statements describe the same kind of file.
 *
 * Silence agrees with everything; text agrees with text; a container agrees with
 * what it contains. Everything else must match exactly.
 */
export function mimeTypesAgree(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = canonical(a);
  const right = canonical(b);

  if (isSilent(left) || isSilent(right)) return true;
  if (left === right) return true;
  if (isTextLike(left!) && isTextLike(right!)) return true;
  return inSameContainerFamily(left!, right!);
}

/** The MIME type a filename's extension claims, or null when it claims nothing. */
export function mimeTypeForFilename(filename: string | null | undefined): string | null {
  if (!filename) return null;
  const extension = getExtension(filename);
  if (!extension) return null;
  return canonical(getContentTypeByExtension(extension));
}

export interface TypeAgreementInput {
  /** The uploaded filename, if any. Its extension is one of the claims. */
  filename?: string | null;
  /** The MIME type the client declared for the upload. */
  declaredMime?: string | null;
  /**
   * The MIME type detected from the file's leading bytes. Omitted when the bytes
   * have not been seen — a presigned upload before its confirm read — in which
   * case only the two client-supplied claims are compared with each other.
   */
  detectedMime?: string | null;
}

export type TypeAgreementViolation = {
  code: 'EXTENSION_BYTES_MISMATCH' | 'DECLARED_BYTES_MISMATCH' | 'DECLARED_EXTENSION_MISMATCH';
  message: string;
  filename?: string | null;
  extensionMime?: string | null;
  declaredMime?: string | null;
  detectedMime?: string | null;
};

export type TypeAgreementResult =
  | { ok: true; violation?: undefined }
  | { ok: false; violation: TypeAgreementViolation };

/**
 * Check the declared type, the filename's extension and the detected bytes
 * against each other.
 *
 * Returns the first disagreement found, bytes-first: when bytes are available
 * they are the evidence, so "the extension lies about the bytes" is the more
 * useful thing to report than "the two client claims differ".
 */
export function checkTypeAgreement(input: TypeAgreementInput): TypeAgreementResult {
  const { filename } = input;
  const declaredMime = canonical(input.declaredMime);
  const detectedMime = canonical(input.detectedMime);
  const extensionMime = mimeTypeForFilename(filename);

  const violation = (
    code: TypeAgreementViolation['code'],
    message: string,
  ): TypeAgreementResult => ({
    ok: false,
    violation: { code, message, filename, extensionMime, declaredMime, detectedMime },
  });

  if (!mimeTypesAgree(extensionMime, detectedMime)) {
    return violation(
      'EXTENSION_BYTES_MISMATCH',
      `file "${filename}" is named as ${extensionMime} but its bytes are ${detectedMime}`,
    );
  }

  if (!mimeTypesAgree(declaredMime, detectedMime)) {
    return violation(
      'DECLARED_BYTES_MISMATCH',
      `upload declares ${declaredMime} but its bytes are ${detectedMime}`,
    );
  }

  if (!mimeTypesAgree(declaredMime, extensionMime)) {
    return violation(
      'DECLARED_EXTENSION_MISMATCH',
      `upload declares ${declaredMime} but is named "${filename}", which is ${extensionMime}`,
    );
  }

  return { ok: true };
}
