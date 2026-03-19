/**
 * Upload resolver for the Constructive upload plugin.
 *
 * Reads CDN/S3/MinIO configuration from environment variables (via getEnvOptions)
 * and streams uploaded files to the configured storage backend.
 *
 * Lazily initializes the S3 storage provider on first upload to avoid requiring
 * env vars at module load time.
 *
 * Key format: {database_id}/{bucket_key}/{uuid}_origin
 * INSERTs into files_store_public.files after S3 upload.
 * The AFTER INSERT trigger enqueues a process-image job automatically.
 *
 * Callers must associate the returned metadata with a domain table row via a
 * GraphQL mutation; the domain trigger automatically populates source_* fields;
 * files not associated within 7 days are cleaned up by unattached_cleanup cron.
 *
 * ENV VARS:
 *   BUCKET_PROVIDER  - 'minio' | 's3' (default: 'minio')
 *   BUCKET_NAME      - bucket name (default: 'test-bucket')
 *   AWS_REGION       - AWS region (default: 'us-east-1')
 *   AWS_ACCESS_KEY   - access key (default: 'minioadmin')
 *   AWS_SECRET_KEY   - secret key (default: 'minioadmin')
 *   MINIO_ENDPOINT   - MinIO endpoint (default: 'http://localhost:9000')
 */

import { S3StorageProvider, streamContentType } from '@constructive-io/s3-streamer';
import type { StorageProvider } from '@constructive-io/s3-streamer';
import uploadNames from '@constructive-io/upload-names';
import { getEnvOptions } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import type { Readable } from 'stream';
import type {
	FileUpload,
	UploadFieldDefinition,
	UploadPluginInfo,
} from 'graphile-upload-plugin';

const log = new Logger('upload-resolver');
const DEFAULT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml'];

let storageProvider: StorageProvider | null = null;
let bucketName: string;
let pgPool: Pool | null = null;

function getCdnConfig() {
	const opts = getEnvOptions();
	const cdn = opts.cdn || {};
	return {
		provider: (cdn.provider || 'minio') as 'minio' | 's3',
		bucketName: cdn.bucketName || 'test-bucket',
		awsRegion: cdn.awsRegion || 'us-east-1',
		awsAccessKey: cdn.awsAccessKey || 'minioadmin',
		awsSecretKey: cdn.awsSecretKey || 'minioadmin',
		minioEndpoint: cdn.minioEndpoint || 'http://localhost:9000',
	};
}

function getStorageProvider(): StorageProvider {
	if (storageProvider) return storageProvider;

	const cdn = getCdnConfig();
	bucketName = cdn.bucketName;

	if (process.env.NODE_ENV === 'production') {
		if (cdn.awsAccessKey === 'minioadmin' || cdn.awsSecretKey === 'minioadmin') {
			log.warn('[upload-resolver] WARNING: Using default credentials in production.');
		}
	}

	log.info(
		`[upload-resolver] Initializing: provider=${cdn.provider} bucket=${bucketName}`,
	);

	storageProvider = new S3StorageProvider({
		bucket: cdn.bucketName,
		awsRegion: cdn.awsRegion,
		awsAccessKey: cdn.awsAccessKey,
		awsSecretKey: cdn.awsSecretKey,
		minioEndpoint: cdn.minioEndpoint,
		provider: cdn.provider,
	});

	return storageProvider;
}

function getPgPool(): Pool {
	if (pgPool) return pgPool;
	pgPool = new Pool({
		host: process.env.PGHOST || 'localhost',
		port: Number(process.env.PGPORT || 5432),
		database: process.env.PGDATABASE || 'constructive',
		user: process.env.PGUSER || 'postgres',
		password: process.env.PGPASSWORD || 'password',
		max: 3,
	});
	return pgPool;
}

/**
 * Generates a v2 storage key.
 * Format: {database_id}/{bucket_key}/{uuid}_origin
 */
function generateV2Key(databaseId: string, bucketKey: string): { key: string; fileId: string } {
	const fileId = randomUUID();
	return { key: `${databaseId}/${bucketKey}/${fileId}_origin`, fileId };
}

/**
 * INSERTs a row into files_store_public.files.
 * Fires the AFTER INSERT trigger which enqueues a process-image job.
 */
async function insertFileRecord(
	fileId: string,
	databaseId: string,
	bucketKey: string,
	key: string,
	etag: string,
	createdBy: string | null,
	contentType: string | null,
	source?: { table: string; column: string; id: string } | null,
): Promise<void> {
	const pool = getPgPool();
	await pool.query(
		`INSERT INTO files_store_public.files
		   (id, database_id, bucket_key, key, etag, created_by, mime_type,
		    source_table, source_column, source_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		[
			fileId, databaseId, bucketKey, key, etag, createdBy, contentType,
			source?.table || null, source?.column || null, source?.id || null,
		],
	);
}

/**
 * Extracts databaseId and userId from the GraphQL context.
 * In PostGraphile, context contains the Express request.
 */
function extractContextInfo(context: any): { databaseId: string | null; userId: string | null } {
	const req = context?.req || context?.request;
	const databaseId = req?.api?.databaseId || req?.databaseId || null;
	const userId = req?.token?.user_id || null;
	return { databaseId, userId };
}

/**
 * Streams a file to S3/MinIO storage and returns the URL and metadata.
 *
 * Reusable by both the GraphQL upload resolver and REST /upload endpoint.
 */
export async function streamToStorage(
	readStream: Readable,
	filename: string,
	opts?: {
		databaseId?: string;
		userId?: string;
		bucketKey?: string;
		source?: { table: string; column: string; id: string } | null;
	},
): Promise<{ url: string; filename: string; mime: string; key?: string }> {
	const storage = getStorageProvider();
	const bucketKey = opts?.bucketKey || 'default';
	const databaseId = opts?.databaseId;

	if (!databaseId) {
		throw new Error('[upload-resolver] databaseId is required for file uploads');
	}

	const { key, fileId } = generateV2Key(databaseId, bucketKey);

	const detected = await streamContentType({ readStream, filename });
	const contentType = detected.contentType;

	const result = await storage.upload(key, detected.stream, { contentType });

	await insertFileRecord(fileId, databaseId, bucketKey, key, result.etag, opts?.userId || null, contentType, opts?.source);

	const url = await storage.presignGet(key, 3600);
	return { key, url, filename, mime: contentType };
}

export async function __resetUploadResolverForTests(): Promise<void> {
	if (
		storageProvider
		&& typeof (storageProvider as StorageProvider & { destroy?: () => void }).destroy === 'function'
	) {
		(storageProvider as StorageProvider & { destroy: () => void }).destroy();
	}
	storageProvider = null;

	if (pgPool) {
		await pgPool.end();
	}
	pgPool = null;
}

/**
 * Upload resolver that streams files to S3/MinIO.
 *
 * Returns different shapes based on the column's type hint:
 * - 'image' / 'upload' → { key, url, mime, filename }
 * - 'attachment' / default → url string (for text domain columns)
 *
 * MIME validation happens before persistence: content type is detected from
 * stream bytes, validated against smart-tag/type rules, and only then uploaded.
 */
async function uploadResolver(
	upload: FileUpload,
	_args: unknown,
	_context: unknown,
	info: { uploadPlugin: UploadPluginInfo },
): Promise<unknown> {
	const { tags, type } = info.uploadPlugin;
	const { filename } = upload;

	// MIME type validation from smart tags
	const typ = type || tags?.type;
	const VALID_MIME = /^[a-z]+\/[a-z0-9][a-z0-9!#$&\-.^_+]*$/i;
	const mim: string[] = tags?.mime
		? String(tags.mime)
				.trim()
				.split(',')
				.map((a: string) => a.trim())
				.filter((m: string) => VALID_MIME.test(m))
		: typ === 'image'
			? DEFAULT_IMAGE_MIME_TYPES
			: [];

	const detected = await streamContentType({
		readStream: upload.createReadStream(),
		filename,
	});
	const detectedContentType = detected.contentType;

	if (mim.length && !mim.includes(detectedContentType)) {
		detected.stream.destroy();
		throw new Error('UPLOAD_MIMETYPE');
	}

	const { databaseId, userId } = extractContextInfo(_context);

	if (!databaseId) {
		detected.stream.destroy();
		throw new Error('[upload-resolver] databaseId is required for file uploads');
	}

	const storage = getStorageProvider();
	const bucketKey = 'default';
	const { key, fileId } = generateV2Key(databaseId, bucketKey);

	const result = await storage.upload(key, detected.stream, {
		contentType: detectedContentType,
	});

	await insertFileRecord(fileId, databaseId, bucketKey, key, result.etag, userId, detectedContentType);

	const url = await storage.presignGet(key, 3600);

	switch (typ) {
		case 'image':
		case 'upload':
			return { key, filename, mime: detectedContentType, url };
		case 'attachment':
		default:
			return url;
	}
}

/**
 * Upload field definitions for Constructive's three upload domain types.
 *
 * These match columns whose PostgreSQL type is one of the domains defined
 * in constructive-db/pgpm-modules/types/:
 *
 * - `image`      (public schema) — jsonb domain for images with versions
 * - `upload`     (public schema) — jsonb domain for generic file uploads
 * - `attachment` (public schema) — text domain for simple URL attachments
 *
 * These domain types are part of the platform's core type system, deployed
 * to every application database. They rarely change, so this config is stable.
 */
export const constructiveUploadFieldDefinitions: UploadFieldDefinition[] = [
	{
		name: 'image',
		namespaceName: 'public',
		type: 'image',
		resolve: uploadResolver,
	},
	{
		name: 'upload',
		namespaceName: 'public',
		type: 'upload',
		resolve: uploadResolver,
	},
	{
		name: 'attachment',
		namespaceName: 'public',
		type: 'attachment',
		resolve: uploadResolver,
	},
];
