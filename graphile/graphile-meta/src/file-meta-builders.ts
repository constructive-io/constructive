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
 * The bucket binding comes from the `@fileBucketKey` / `@fileIsPublic` tags
 * constructive-db's DataFileRef generator writes on the column.
 */
export function buildFileFieldMeta(
  attr: PgAttribute | null | undefined,
  filesType: string | null
): FileFieldMeta | null {
  const codec = attr?.codec;
  if (!codec) return null;
  const kind = fileKindOf(codec.arrayOfCodec ?? codec);
  if (!kind) return null;
  const tags = (attr.extensions?.tags ?? {}) as Record<string, unknown>;
  return {
    kind,
    isMultiple: !!codec.arrayOfCodec,
    filesType,
    bucketKey: tagString(tags.fileBucketKey),
    isPublic: tagBoolean(tags.fileIsPublic)
  };
}

function tagString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function tagBoolean(value: unknown): boolean | null {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return null;
}
