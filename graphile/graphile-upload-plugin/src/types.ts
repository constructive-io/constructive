import type { Readable } from 'stream';

/**
 * Represents a file upload received from the client.
 */
export interface FileUpload {
  filename: string;
  mimetype?: string;
  encoding?: string;
  createReadStream: () => Readable;
}

/**
 * Identifies the column an upload is being written into.
 *
 * A resolver that persists through managed storage needs the column's identity,
 * not just its type: which bucket the bytes land in is a property of the field
 * declaration, recorded per (table, column), so a resolver given only
 * `{tags, type}` can do no better than a server-global bucket.
 */
export interface UploadFieldIdentity {
  /** PostgreSQL schema of the table being mutated (e.g. 'app_public') */
  schemaName: string;
  /** PostgreSQL table name being mutated (e.g. 'products') */
  tableName: string;
  /** PostgreSQL column name receiving the upload (e.g. 'photo') */
  columnName: string;
}

/**
 * Additional metadata passed to the upload resolver via the info parameter.
 */
export interface UploadPluginInfo {
  tags: Record<string, any>;
  type?: string;
  /**
   * The column being written. Absent only when the codec carries no PG
   * identity, which a managed resolver must treat as an error rather than
   * falling back to a default bucket.
   */
  field?: UploadFieldIdentity;
}

/**
 * A function that processes an uploaded file and returns the value to store
 * in the database column (e.g., a URL string or a JSON object).
 *
 * Called with the upload stream. The filename comes from user input
 * and MUST be sanitized by the implementation before use in file paths
 * or storage keys (e.g., strip path separators, limit length, validate characters).
 */
export type UploadResolver = (
  upload: FileUpload,
  args: any,
  context: any,
  info: { uploadPlugin: UploadPluginInfo }
) => Promise<any>;

/**
 * Defines which columns should receive upload handling.
 *
 * Two forms are supported:
 * 1. Type-name based: match columns by their PG type name and namespace.
 * 2. Smart-tag based: match columns that have a specific smart tag.
 */
export type UploadFieldDefinition =
  | {
      /** PG type name (e.g., 'text') */
      name: string;
      /** PG schema name (e.g., 'pg_catalog') */
      namespaceName: string;
      /** The GraphQL type name to override to (e.g., 'Upload') */
      type: string;
      /** The resolver function to process the upload */
      resolve: UploadResolver;
      tag?: never;
    }
  | {
      /** Smart tag name to match (e.g., '@upload') */
      tag: string;
      /** The resolver function to process the upload */
      resolve: UploadResolver;
      name?: never;
      namespaceName?: never;
      /** Optional type hint for the resolver */
      type?: string;
    };

/**
 * Plugin options for the upload plugin.
 */
export interface UploadPluginOptions {
  /**
   * Array of upload field definitions that configure which columns
   * should get upload handling.
   */
  uploadFieldDefinitions?: UploadFieldDefinition[];

  /**
   * Maximum file size in bytes. If set, streams exceeding this are rejected.
   * Default: no limit (rely on graphql-upload middleware).
   */
  maxFileSize?: number;
}
