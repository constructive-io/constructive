import { gunzipSync, gzipSync } from 'zlib';

/**
 * Minimal, dependency-free single-file tar (ustar) + gzip codec.
 *
 * The bundle artifact shipped next to `sql/<name>--<version>.sql` is a gzipped
 * tarball holding exactly one entry: the JSON bundle. Only that shape is
 * supported — deliberately, so the artifact stays byte-reproducible and the
 * package layer needs no third-party archive dependency.
 */

const BLOCK = 512;
const NAME_MAX = 100;

function octal(value: number, length: number): string {
  return value.toString(8).padStart(length - 1, '0') + '\0';
}

function header(name: string, size: number): Buffer {
  if (Buffer.byteLength(name) > NAME_MAX) {
    throw new Error(`tar entry name too long (max ${NAME_MAX} bytes): ${name}`);
  }
  const buf = Buffer.alloc(BLOCK);
  buf.write(name, 0, NAME_MAX, 'utf-8');
  buf.write(octal(0o644, 8), 100, 8, 'ascii'); // mode
  buf.write(octal(0, 8), 108, 8, 'ascii'); // uid
  buf.write(octal(0, 8), 116, 8, 'ascii'); // gid
  buf.write(octal(size, 12), 124, 12, 'ascii');
  buf.write(octal(0, 12), 136, 12, 'ascii'); // mtime — fixed for reproducibility
  buf.write('        ', 148, 8, 'ascii'); // checksum placeholder
  buf.write('0', 156, 1, 'ascii'); // type: regular file
  buf.write('ustar\0', 257, 6, 'ascii');
  buf.write('00', 263, 2, 'ascii');

  let checksum = 0;
  for (const byte of buf) checksum += byte;
  buf.write(octal(checksum, 8), 148, 8, 'ascii');
  return buf;
}

function pad(size: number): number {
  const rem = size % BLOCK;
  return rem === 0 ? 0 : BLOCK - rem;
}

/**
 * Pack a single named file into a gzipped tarball. Deterministic: fixed mode,
 * zero mtime/uid/gid, so identical content always yields identical bytes.
 */
export function packSingleFileTarGz(name: string, content: string): Buffer {
  const body = Buffer.from(content, 'utf-8');
  const tar = Buffer.concat([
    header(name, body.length),
    body,
    Buffer.alloc(pad(body.length)),
    Buffer.alloc(BLOCK * 2) // end-of-archive
  ]);
  return gzipSync(tar, { level: 9 });
}

/** One entry read back out of a single-file tarball. */
export interface TarEntry {
  name: string;
  content: string;
}

/**
 * Read the first regular-file entry out of a gzipped tarball, in memory.
 *
 * @throws when the archive is empty or its header is not a readable ustar block.
 */
export function unpackSingleFileTarGz(archive: Buffer): TarEntry {
  const tar = gunzipSync(archive);
  if (tar.length < BLOCK) {
    throw new Error('invalid tar archive: shorter than one block');
  }
  const name = tar.subarray(0, NAME_MAX).toString('utf-8').replace(/\0.*$/, '');
  if (!name) {
    throw new Error('invalid tar archive: no entries');
  }
  const sizeField = tar.subarray(124, 136).toString('ascii').replace(/\0.*$/, '').trim();
  const size = parseInt(sizeField, 8);
  if (!Number.isFinite(size) || size < 0) {
    throw new Error(`invalid tar archive: unreadable size field for ${name}`);
  }
  if (tar.length < BLOCK + size) {
    throw new Error(`invalid tar archive: truncated body for ${name}`);
  }
  return { name, content: tar.subarray(BLOCK, BLOCK + size).toString('utf-8') };
}
