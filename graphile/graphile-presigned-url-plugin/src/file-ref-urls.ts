/**
 * URLs for a file-reference column on a business table.
 *
 * A file-reference column is a column of one of the declared file domains
 * (`FILE_REF_DOMAINS`: `image`, `upload`), or an array of one. It holds a
 * document that projects a files row — `id`, `key`, `bucket_id` — and, when a
 * lane has rendered versions beside the source, lists them under `versions`
 * (`derived/<key>/<name>-<hash>.<ext>`). The column reaches GraphQL as JSON,
 * so without these fields a client has no URL to fetch the file with.
 *
 * For each such column `photo` on a table type this adds
 *   photoUrl(width: Int): String       the narrowest version covering `width`, else the source
 *   photoVersions: [FileVersion!]      each rendered version, with its url
 * and, for an array column, the same as lists with one entry per element. A
 * document with no versions (an `upload` column's, say) gives its source URL
 * and an empty list.
 *
 * The document is written by the client, `versions` included, so nothing in it
 * is authority for a URL:
 *   1. only a document with an `id` resolves, and the files row is read by that
 *      id on the reader's own request lane — the files table's RLS decides,
 *      exactly as it does for `downloadUrl`;
 *   2. the source key, bucket, filename and publicness come from that row,
 *      never from the document;
 *   3. a version is signed only when its key is a direct child of that row's
 *      own `derived/<key>/` prefix. A key the document merely names is never
 *      signed.
 *
 * Files rows are read once per request, not once per document: every document
 * a request resolves in one tick shares one lookup per storage module, and a
 * row or bucket coordinate read once is kept for the rest of the request.
 */

import 'graphile-build';

import { Logger } from '@pgpmjs/logger';
import { context as grafastContext, lambda, object } from 'grafast';
import type { GraphileConfig } from 'graphile-config';
import { withRequestPgClient } from 'graphile-plugin-utils';
import { FILE_REF_DOMAINS } from 'graphile-storage-registry';

import { isDownloadableFileRow } from './file-lifecycle';
import { resolveS3ForDatabase } from './physical-bucket';
import { generatePresignedGetUrl } from './s3-signer';
import { loadAllStorageModules, readBucketPhysicalName } from './storage-module-cache';
import type { PresignedUrlPluginOptions, StorageModuleConfig } from './types';

const log = new Logger('graphile-presigned-url:file-ref-urls');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface FileVersion {
  name: string | null;
  key: string;
  width: number | null;
  height: number | null;
  format: string | null;
  size: number | null;
  url: string;
}

export interface ResolvedFile {
  /** URL of the source object. */
  url: string;
  /** The versions that belong to the source, narrowest first. */
  versions: FileVersion[];
}

interface FilesRow {
  id: string;
  key: string;
  bucket_id: string;
  is_public: boolean | null;
  status: string | null;
  filename: string | null;
}

/** A files row the reader can fetch, with where its bytes live. */
interface FetchableFile {
  config: StorageModuleConfig;
  row: FilesRow;
  physicalName: string;
}

type PgClientLike = {
  query(opts: { text: string; values?: unknown[] }): Promise<{ rows: any[] }>;
};

/**
 * Whether `variantKey` is an object a lane wrote beside the file at
 * `sourceKey`: a direct child of `derived/<sourceKey>/`.
 */
export function isVersionKeyOf(sourceKey: string, variantKey: unknown): variantKey is string {
  if (typeof variantKey !== 'string' || !sourceKey) return false;
  const prefix = `derived/${sourceKey}/`;
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
export function ownVersions(sourceKey: string, versions: unknown): Array<Omit<FileVersion, 'url'>> {
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
export function pickUrl(file: ResolvedFile, width: number | null | undefined): string {
  if (width == null) return file.url;
  return file.versions.find((v) => v.width !== null && v.width >= width)?.url ?? file.url;
}

/**
 * The files rows one request reads. Ids asked for in the same tick are read
 * together: one lookup per storage module for all of them, one coordinate read
 * per bucket. What was read stays for the request.
 */
class RequestFiles {
  private readonly files = new Map<string, Promise<FetchableFile | null>>();
  private waiting: Array<{ id: string; settle: (hit: FetchableFile | null) => void; fail: (e: unknown) => void }> = [];
  private readonly buckets = new Map<string, string | null>();

  constructor(private readonly withPgClient: any, private readonly pgSettings: any) {}

  get(id: string): Promise<FetchableFile | null> {
    const key = id.toLowerCase();
    let hit = this.files.get(key);
    if (!hit) {
      hit = new Promise<FetchableFile | null>((settle, fail) => {
        if (this.waiting.length === 0) process.nextTick(() => this.flush());
        this.waiting.push({ id: key, settle, fail });
      });
      this.files.set(key, hit);
    }
    return hit;
  }

  private async flush(): Promise<void> {
    const batch = this.waiting;
    this.waiting = [];
    try {
      const found = await withRequestPgClient(this.withPgClient, this.pgSettings, (pgClient: PgClientLike) =>
        this.read(pgClient, batch.map((w) => w.id)),
      );
      for (const w of batch) w.settle(found.get(w.id) ?? null);
    } catch (e) {
      for (const w of batch) w.fail(e);
    }
  }

  private async read(pgClient: PgClientLike, ids: string[]): Promise<Map<string, FetchableFile>> {
    const found = new Map<string, FetchableFile>();
    const db = await pgClient.query({ text: `SELECT jwt_private.current_database_id() AS id` });
    const databaseId = db.rows[0]?.id as string | undefined;
    if (!databaseId) return found;

    let missing = ids;
    for (const config of await loadAllStorageModules(pgClient, databaseId)) {
      if (missing.length === 0) break;
      const { rows } = await pgClient.query({
        text: `SELECT id, key, bucket_id, is_public, status::text AS status, filename FROM ${config.filesQualifiedName} WHERE id = ANY($1::uuid[])`,
        values: [missing],
      });
      for (const row of rows as FilesRow[]) {
        if (!row.key || !isDownloadableFileRow(row)) continue;
        const bucketKey = `${config.id}:${row.bucket_id}`;
        if (!this.buckets.has(bucketKey)) {
          this.buckets.set(bucketKey, await readBucketPhysicalName(pgClient, config, row.bucket_id));
        }
        const physicalName = this.buckets.get(bucketKey);
        // No physical bucket was ever provisioned: no object can exist.
        if (physicalName != null) found.set(String(row.id).toLowerCase(), { config, row, physicalName });
      }
      const seen = new Set((rows as FilesRow[]).map((row) => String(row.id).toLowerCase()));
      missing = missing.filter((id) => !seen.has(id));
    }
    return found;
  }
}

const requests = new WeakMap<object, RequestFiles>();

function requestFiles(withPgClient: any, pgSettings: object): RequestFiles {
  let files = requests.get(pgSettings);
  if (!files) {
    files = new RequestFiles(withPgClient, pgSettings);
    requests.set(pgSettings, files);
  }
  return files;
}

/**
 * Resolve one file document to URLs, or null when it names no file the reader
 * can fetch.
 */
export async function resolveFileDocument(
  options: PresignedUrlPluginOptions,
  withPgClient: any,
  pgSettings: any,
  doc: unknown,
): Promise<ResolvedFile | null> {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;
  const id = (doc as Record<string, unknown>).id;
  if (typeof id !== 'string' || !UUID.test(id)) return null;
  if (!withPgClient || !pgSettings) return null;

  const found = await requestFiles(withPgClient, pgSettings).get(id);
  if (!found) return null;

  const { config, row, physicalName } = found;
  const s3 = resolveS3ForDatabase(options, config, physicalName);
  const urlFor = (key: string, filename?: string): Promise<string> | string =>
    row.is_public && s3.publicUrlPrefix
      ? `${s3.publicUrlPrefix}/${s3.bucket}/${key}`
      : generatePresignedGetUrl(s3, key, config.downloadUrlExpirySeconds, filename);

  const versions = await Promise.all(
    ownVersions(row.key, (doc as Record<string, unknown>).versions).map(async (v) => ({ ...v, url: await urlFor(v.key) })),
  );
  // As `downloadUrl` does, the source is served under the name it was uploaded with.
  return { url: await urlFor(row.key, row.filename || undefined), versions };
}

/** `'scalar'` for a column of a file domain, `'list'` for an array of one, else null. */
export function fileRefColumnKind(codec: any, domains: readonly string[]): 'scalar' | 'list' | null {
  const isFileDomain = (c: any): boolean =>
    c?.domainOfCodec?.name === 'jsonb' && domains.includes(c.extensions?.pg?.name);
  if (isFileDomain(codec)) return 'scalar';
  if (codec?.arrayOfCodec && isFileDomain(codec.arrayOfCodec)) return 'list';
  return null;
}

const PLUGIN = 'PresignedUrlFileRefUrlsPlugin';

export function createFileRefUrlsPlugin(options: PresignedUrlPluginOptions): GraphileConfig.Plugin {
  const domains = options.fileRefDomains ?? FILE_REF_DOMAINS;

  return {
    name: PLUGIN,
    version: '0.2.0',
    description: 'Adds <column>Url(width) and <column>Versions beside each file-reference column',

    schema: {
      hooks: {
        init(_, build) {
          const {
            graphql: { GraphQLInt, GraphQLNonNull, GraphQLString },
          } = build;
          build.registerObjectType(
            'FileVersion',
            {},
            () => ({
              description: 'One version rendered beside a file, with a URL to fetch it.',
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
            `${PLUGIN} registering FileVersion`,
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
          const FileVersionType = build.getTypeByName('FileVersion') as any;
          if (!FileVersionType) return fields;

          const added: Record<string, unknown> = {};
          for (const [attributeName, attribute] of Object.entries(pgCodec.attributes as Record<string, any>)) {
            const kind = fileRefColumnKind(attribute.codec, domains);
            if (!kind) continue;
            // A column the API does not select stays unread here too.
            if (!(build as any).behavior.pgCodecAttributeMatches([pgCodec, attributeName], 'attribute:select')) continue;
            const base = (inflection as any).attribute({ attributeName, codec: pgCodec });
            const urlField = `${base}Url`;
            const versionsField = `${base}Versions`;
            if (fields[urlField] || fields[versionsField]) {
              log.warn(`${pgCodec.name}.${attributeName}: ${urlField}/${versionsField} already exist; not adding file URL fields`);
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
                if (kind === 'scalar') return resolveFileDocument(options, withPgClient, pgSettings, value);
                return Promise.all(
                  (value as unknown[]).map((doc) => resolveFileDocument(options, withPgClient, pgSettings, doc)),
                );
              });
            };
            const each = <T>(file: any, fn: (one: ResolvedFile) => T) =>
              file == null ? null : kind === 'scalar' ? fn(file) : (file as Array<ResolvedFile | null>).map((one) => (one ? fn(one) : null));

            const versionList = new GraphQLList(new GraphQLNonNull(FileVersionType));
            added[urlField] = context.fieldWithHooks({ fieldName: urlField } as any, {
              description:
                `URL to fetch \`${base}\`: the narrowest rendered version at least \`width\` pixels wide, ` +
                'else the source file. Null when the column names no file the reader can fetch.',
              type: kind === 'scalar' ? GraphQLString : new GraphQLList(GraphQLString),
              args: {
                width: {
                  type: GraphQLInt,
                  description: 'The width the file will be shown at, in device pixels. Without a version that wide, the source.',
                },
              },
              plan($parent: any, fieldArgs: any) {
                const $both = object({ file: resolved($parent), width: fieldArgs.getRaw('width') });
                return lambda($both, ({ file, width }: any) => each(file, (one) => pickUrl(one, width)));
              },
            });
            added[versionsField] = context.fieldWithHooks({ fieldName: versionsField } as any, {
              description: `The versions rendered beside \`${base}\`, narrowest first, each with a URL. Empty when there are none.`,
              type: kind === 'scalar' ? versionList : new GraphQLList(versionList),
              plan($parent: any) {
                return lambda(resolved($parent), (file: any) => each(file, (one) => one.versions));
              },
            });
          }

          return Object.keys(added).length
            ? build.extend(fields, added as any, `${PLUGIN} adding file URL fields`)
            : fields;
        },
      },
    },
  };
}

export default createFileRefUrlsPlugin;
