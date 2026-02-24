/**
 * Upload resolver for the Constructive upload plugin.
 *
 * Reads CDN/S3/MinIO configuration from environment variables (via getEnvOptions)
 * and streams uploaded files to the configured storage backend.
 *
 * Lazily initializes the S3 streamer on first upload to avoid requiring
 * env vars at module load time.
 *
 * ENV VARS:
 *   BUCKET_PROVIDER  - 'minio' | 's3' (default: 'minio')
 *   BUCKET_NAME      - bucket name (default: 'test-bucket')
 *   AWS_REGION       - AWS region (default: 'us-east-1')
 *   AWS_ACCESS_KEY   - access key (default: 'minioadmin')
 *   AWS_SECRET_KEY   - secret key (default: 'minioadmin')
 *   MINIO_ENDPOINT   - MinIO endpoint (default: 'http://localhost:9000')
 */

import Streamer from '@constructive-io/s3-streamer';
import uploadNames from '@constructive-io/upload-names';
import { getEnvOptions } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import { randomBytes } from 'crypto';
import type { Readable } from 'stream';
import type {
	FileUpload,
	UploadFieldDefinition,
	UploadPluginInfo,
} from 'graphile-upload-plugin';

const log = new Logger('upload-resolver');
const DEFAULT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml'];

let streamer: Streamer | null = null;
let bucketName: string;

function getStreamer(): Streamer {
	if (streamer) return streamer;

	const opts = getEnvOptions();
	const cdn = opts.cdn || {};

	const provider = cdn.provider || 'minio';
	bucketName = cdn.bucketName || 'test-bucket';
	const awsRegion = cdn.awsRegion || 'us-east-1';
	const awsAccessKey = cdn.awsAccessKey || 'minioadmin';
	const awsSecretKey = cdn.awsSecretKey || 'minioadmin';
	const minioEndpoint = cdn.minioEndpoint || 'http://localhost:9000';

	log.info(
		`[upload-resolver] Initializing: provider=${provider} bucket=${bucketName}`,
	);

	streamer = new Streamer({
		defaultBucket: bucketName,
		awsRegion,
		awsSecretKey,
		awsAccessKey,
		minioEndpoint,
		provider,
	});

	return streamer;
}

/**
 * Generates a randomized storage key from a filename.
 * Format: {random10chars}-{sanitized-filename}
 */
function generateKey(filename: string): string {
	const rand = randomBytes(12).toString('hex');
	return `${rand}-${uploadNames(filename)}`;
}

/**
 * Streams a file to S3/MinIO storage and returns the URL and metadata.
 *
 * Reusable by both the GraphQL upload resolver and REST /upload endpoint.
 */
export async function streamToStorage(
	readStream: Readable,
	filename: string,
): Promise<{ url: string; filename: string; mime: string }> {
	const s3 = getStreamer();
	const key = generateKey(filename);
	const result = await s3.upload({
		readStream,
		filename,
		key,
		bucket: bucketName,
	});
	return {
		url: result.upload.Location,
		filename,
		mime: result.contentType,
	};
}

/**
 * Upload resolver that streams files to S3/MinIO.
 *
 * Returns different shapes based on the column's type hint:
 * - 'image' / 'upload' → { filename, mime, url } (for jsonb domain columns)
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
	const s3 = getStreamer();
	const { filename } = upload;
	const key = generateKey(filename);

	// MIME type validation from smart tags
	const typ = type || tags?.type;
	const mim: string[] = tags?.mime
		? String(tags.mime)
				.trim()
				.split(',')
				.map((a: string) => a.trim())
		: typ === 'image'
			? DEFAULT_IMAGE_MIME_TYPES
			: [];

	const detected = await s3.detectContentType({
		readStream: upload.createReadStream(),
		filename,
	});
	const detectedContentType = detected.contentType;

	if (mim.length && !mim.includes(detectedContentType)) {
		detected.stream.destroy();
		throw new Error(`UPLOAD_MIMETYPE ${mim.join(',')}`);
	}

	const result = await s3.uploadWithContentType({
		readStream: detected.stream,
		contentType: detectedContentType,
		magic: detected.magic,
		key,
		bucket: bucketName,
	});

	const url = result.upload.Location;
	const { contentType } = result;

	switch (typ) {
		case 'image':
		case 'upload':
			return { filename, mime: contentType, url };
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
