/**
 * Byte-correct statement slicing.
 *
 * libpg-query reports statement offsets (`stmt_location` / `stmt_len`, and the
 * `span` that `@pgsql/semantics` derives from them) as UTF-8 **byte** offsets,
 * but JavaScript string indexing is UTF-16. The two agree only while a script
 * is pure ASCII; a single non-ASCII byte (an em dash in a comment, an accented
 * word in a seed row, an emoji) shifts every later byte offset past its JS
 * index, so slicing the source string directly with `String.prototype.slice`
 * mis-cuts every statement that follows it — e.g. `COMMENT ON ...` reappears as
 * `MMENT ON ...` and fails to reparse.
 *
 * Slice on the UTF-8 bytes instead and decode back to text. Statement offsets
 * always fall on character boundaries, so decoding a byte range never splits a
 * multibyte character.
 */
export const sqlSourceBytes = (source: string): Buffer => Buffer.from(source, 'utf8');

/**
 * Slice a statement's verbatim text out of the source bytes by its byte-offset
 * span. `len === undefined` slices to the end of the source (libpg-query omits
 * `stmt_len` for the final statement).
 */
export const sliceStatementBytes = (sourceBytes: Buffer, start: number, len?: number): string => {
  const end = len === undefined ? sourceBytes.length : start + len;
  return sourceBytes.subarray(start, end).toString('utf8');
};
