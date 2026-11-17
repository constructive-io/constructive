import type { FileFieldMeta, FileKind, PgAttribute, PgCodec } from './types';

/**
 * The Constructive file domains (pgpm-modules/types) and the type each one is
 * a domain over. `image` and `upload` hold a file document (jsonb),
 * `attachment` holds a link (text). A domain with one of these names over a
 * different type is not one of them.
 */
const FILE_DOMAIN_BASE_TYPES: Readonly<Record<FileKind, string>> = {
  image: 'jsonb',
  upload: 'jsonb',
  attachment: 'text'
};

function isFileKind(name: string | undefined): name is FileKind {
  return !!name && Object.prototype.hasOwnProperty.call(FILE_DOMAIN_BASE_TYPES, name);
}

function fileKindOf(codec: PgCodec | null | undefined): FileKind | null {
  const typeName = codec?.extensions?.pg?.name ?? codec?.name;
  if (!isFileKind(typeName)) return null;
  return codec?.domainOfCodec?.name === FILE_DOMAIN_BASE_TYPES[typeName] ? typeName : null;
}

/**
 * File details for a column whose type is a file domain, or a list of one.
 * `filesType` is the API's only storage files table (see `soleFilesTypeName`).
 */
export function buildFileFieldMeta(
  attr: PgAttribute | null | undefined,
  filesType: string | null
): FileFieldMeta | null {
  const codec = attr?.codec;
  if (!codec) return null;
  const kind = fileKindOf(codec.arrayOfCodec ?? codec);
  return kind ? { kind, isMultiple: !!codec.arrayOfCodec, filesType } : null;
}
