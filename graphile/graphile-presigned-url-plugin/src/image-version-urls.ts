/**
 * URLs for an `image` column on a business table.
 *
 * An `image` column holds a document that projects a files row — `id`, `key`,
 * `bucket_id` — and, once the image lane has run, the `versions` it rendered
 * beside the source (`<key>.versions/<name>-<hash>.<ext>`). The column reaches
 * GraphQL as JSON, so without these fields a client can pick a size and has no
 * URL to fetch it with.
 *
 * For each `image` column `photo` on a table type this adds
 *   photoUrl(width: Int): String        the smallest version covering `width`, else the source
 *   photoVersions: [ImageVersion!]      each rendered version, with its url
 * and, for an `image[]` column, the same as lists with one entry per element.
 *
 * The document is written by the client, `versions` included, so nothing in it
 * is authority for a URL:
 *   1. only a document with an `id` resolves, and the files row is read by that
 *      id on the reader's own request lane — the files table's RLS decides,
 *      exactly as it does for `downloadUrl`;
 *   2. the source key, bucket and publicness come from that row, never from
 *      the document;
 *   3. a version is signed only when its key is a direct child of that row's
 *      own `<key>.versions/` prefix. A key the document merely names is never
 *      signed.
 */

import 'graphile-build';

import { Logger } from '@pgpmjs/logger';
import { context as grafastContext, lambda, object } from 'grafast';
import type { GraphileConfig } from 'graphile-config';
import { withRequestPgClient } from 'graphile-plugin-utils';

import { isLiveFileRow } from './file-lifecycle';
import { resolveS3ForDatabase } from './physical-bucket';
import { generatePresignedGetUrl } from './s3-signer';
import { loadAllStorageModules, readBucketPhysicalName } from './storage-module-cache';
import type { PresignedUrlPluginOptions, StorageModuleConfig } from './types';

const log = new Logger('graphile-presigned-url:image-version-urls');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ImageVersionUrl {
  name: string | null;
  key: string;
  width: number | null;
  height: number | null;
  format: string | null;
  size: number | null;
  url: string;
}

export interface ResolvedImage {
  /** URL of the source object. */
  url: string;
  /** The versions that belong to the source, narrowest first. */
  versions: ImageVersionUrl[];
}

interface FilesRow {
  key: string;
  bucket_id: string;
  is_public: boolean | null;
  status: string | null;
}

type PgClientLike = {
  query(opts: { text: string; values?: unknown[] }): Promise<{ rows: any[] }>;
};

/**
 * Whether `variantKey` is an object the image lane wrote for the file at
 * `sourceKey`: a direct child of `<sourceKey>.versions/`.
 */
export function isVersionKeyOf(sourceKey: string, variantKey: unknown): variantKey is string {
  if (typeof variantKey !== 'string' || !sourceKey) return false;
  const prefix = `${sourceKey}.versions/`;
  if (!variantKey.startsWith(prefix)) return false;
  const name = variantKey.slice(prefix.length);
  return name.length > 0 && !name.includes('/') && name !== '.' && name !== '..';
}

const numberOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const stringOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/**
 * The version entries of a document that belong to the file at `sourceKey`,
 * narrowest first. Entries naming any other key are dropped.
 */
export function ownVersions(sourceKey: string, versions: unknown): Array<Omit<ImageVersionUrl, 'url'>> {
  if (!Array.isArray(versions)) return [];
  return versions
    .filter((v): v is Record<string, unknown> => !!v && typeof v === 'object' && isVersionKeyOf(sourceKey, (v as any).key))
    .map((v) => ({
      name: stringOrNull(v.name),
      key: v.key as string,
      width: numberOrNull(v.width),
      height: numberOrNull(v.height),
      format: stringOrNull(v.format),
      size: numberOrNull(v.size),
    }))
    .sort((a, b) => (a.width ?? Infinity) - (b.width ?? Infinity));
}

/** The URL for a requested width: the narrowest version at least that wide, else the source. */
export function pickUrl(image: ResolvedImage, width: number | null | undefined): string {
  if (width == null) return image.url;
  return image.versions.find((v) => v.width !== null && v.width >= width)?.url ?? image.url;
}

/**
 * Read the files row a document claims, as the reader, across the database's
 * storage modules. A row the reader cannot see does not exist here.
 */
async function readFilesRow(
  pgClient: PgClientLike,
  configs: StorageModuleConfig[],
  fileId: string,
): Promise<{ config: StorageModuleConfig; row: FilesRow } | null> {
  for (const config of configs) {
    const { rows } = await pgClient.query({
      text: `SELECT key, bucket_id, is_public, status::text AS status FROM ${config.filesQualifiedName} WHERE id = $1 LIMIT 1`,
      values: [fileId],
    });
    if (rows.length > 0) return { config, row: rows[0] as FilesRow };
  }
  return null;
}

/**
 * Resolve one image document to URLs, or null when it names no file the reader
 * can fetch.
 */
export async function resolveImageDocument(
  options: PresignedUrlPluginOptions,
  withPgClient: any,
  pgSettings: any,
  doc: unknown,
): Promise<ResolvedImage | null> {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;
  const id = (doc as Record<string, unknown>).id;
  if (typeof id !== 'string' || !UUID.test(id)) return null;
  if (!withPgClient || !pgSettings) return null;

  const found = await withRequestPgClient(withPgClient, pgSettings, async (pgClient: PgClientLike) => {
    const db = await pgClient.query({ text: `SELECT jwt_private.current_database_id() AS id` });
    const databaseId = db.rows[0]?.id as string | undefined;
    if (!databaseId) return null;
    const configs = await loadAllStorageModules(pgClient, databaseId);
    const hit = await readFilesRow(pgClient, configs, id);
    if (!hit || !hit.row.key || !isLiveFileRow(hit.row)) return null;
    const physicalName = await readBucketPhysicalName(pgClient, hit.config, hit.row.bucket_id);
    return physicalName === null ? null : { ...hit, physicalName };
  });
  if (!found) return null;

  const { config, row, physicalName } = found;
  const s3 = resolveS3ForDatabase(options, config, physicalName);
  const urlFor = (key: string): Promise<string> | string =>
    row.is_public && s3.publicUrlPrefix
      ? `${s3.publicUrlPrefix}/${s3.bucket}/${key}`
      : generatePresignedGetUrl(s3, key, config.downloadUrlExpirySeconds);

  const versions = await Promise.all(
    ownVersions(row.key, (doc as Record<string, unknown>).versions).map(async (v) => ({ ...v, url: await urlFor(v.key) })),
  );
  return { url: await urlFor(row.key), versions };
}

const isImageDomain = (codec: any): boolean =>
  !!codec?.domainOfCodec && codec.extensions?.pg?.name === 'image';

/** `'scalar'` for an `image` column, `'list'` for `image[]`, else null. */
function imageColumnKind(codec: any): 'scalar' | 'list' | null {
  if (isImageDomain(codec)) return 'scalar';
  if (codec?.arrayOfCodec && isImageDomain(codec.arrayOfCodec)) return 'list';
  return null;
}

export function createImageVersionUrlsPlugin(options: PresignedUrlPluginOptions): GraphileConfig.Plugin {
  return {
    name: 'PresignedUrlImageVersionsPlugin',
    version: '0.1.0',
    description: 'Adds <column>Url(width) and <column>Versions beside each image column',

    schema: {
      hooks: {
        init(_, build) {
          const {
            graphql: { GraphQLInt, GraphQLNonNull, GraphQLString },
          } = build;
          build.registerObjectType(
            'ImageVersion',
            {},
            () => ({
              description: 'One rendered version of an image, with a URL to fetch it.',
              fields: {
                name: { type: GraphQLString },
                key: { type: new GraphQLNonNull(GraphQLString) },
                width: { type: GraphQLInt },
                height: { type: GraphQLInt },
                format: { type: GraphQLString },
                size: { type: GraphQLInt },
                url: { type: new GraphQLNonNull(GraphQLString) },
              },
            }),
            'PresignedUrlImageVersionsPlugin registering ImageVersion',
          );
          return _;
        },

        GraphQLObjectType_fields(fields, build, context) {
          const {
            scope: { pgCodec, isPgClassType },
          } = context as any;
          if (!isPgClassType || !pgCodec?.attributes) return fields;

          const {
            inflection,
            graphql: { GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLString },
          } = build;
          const ImageVersion = build.getTypeByName('ImageVersion') as any;
          if (!ImageVersion) return fields;

          const added: Record<string, unknown> = {};
          for (const [attributeName, attribute] of Object.entries(pgCodec.attributes as Record<string, any>)) {
            const kind = imageColumnKind(attribute.codec);
            if (!kind) continue;
            // A column the API does not select stays unread here too.
            if (!(build as any).behavior.pgCodecAttributeMatches([pgCodec, attributeName], 'attribute:select')) continue;
            const base = (inflection as any).attribute({ attributeName, codec: pgCodec });
            const urlField = `${base}Url`;
            const versionsField = `${base}Versions`;
            if (fields[urlField] || fields[versionsField]) {
              log.warn(`${pgCodec.name}.${attributeName}: ${urlField}/${versionsField} already exist; not adding image URL fields`);
              continue;
            }

            const resolved = ($parent: any) => {
              const $combined = object({
                value: $parent.get(attributeName),
                withPgClient: (grafastContext() as any).get('withPgClient'),
                pgSettings: (grafastContext() as any).get('pgSettings'),
              });
              return lambda($combined, async ({ value, withPgClient, pgSettings }: any) => {
                if (value == null) return null;
                if (kind === 'scalar') return resolveImageDocument(options, withPgClient, pgSettings, value);
                return Promise.all(
                  (value as unknown[]).map((doc) => resolveImageDocument(options, withPgClient, pgSettings, doc)),
                );
              });
            };
            const each = <T>(image: any, fn: (one: ResolvedImage) => T) =>
              image == null ? null : kind === 'scalar' ? fn(image) : (image as Array<ResolvedImage | null>).map((one) => (one ? fn(one) : null));

            const versionList = new GraphQLList(new GraphQLNonNull(ImageVersion));
            added[urlField] = context.fieldWithHooks({ fieldName: urlField } as any, {
              description:
                `URL to fetch \`${base}\`: the narrowest rendered version at least \`width\` pixels wide, ` +
                'else the source. Null when the column names no file the reader can fetch.',
              type: kind === 'scalar' ? GraphQLString : new GraphQLList(GraphQLString),
              args: { width: { type: GraphQLInt, description: 'The width the image will be shown at, in device pixels.' } },
              plan($parent: any, fieldArgs: any) {
                const $both = object({ image: resolved($parent), width: fieldArgs.getRaw('width') });
                return lambda($both, ({ image, width }: any) => each(image, (one) => pickUrl(one, width)));
              },
            });
            added[versionsField] = context.fieldWithHooks({ fieldName: versionsField } as any, {
              description: `The rendered versions of \`${base}\`, narrowest first, each with a URL.`,
              type: kind === 'scalar' ? versionList : new GraphQLList(versionList),
              plan($parent: any) {
                return lambda(resolved($parent), (image: any) => each(image, (one) => one.versions));
              },
            });
          }

          return Object.keys(added).length
            ? build.extend(fields, added as any, 'PresignedUrlImageVersionsPlugin adding image URL fields')
            : fields;
        },
      },
    },
  };
}

export default createImageVersionUrlsPlugin;
