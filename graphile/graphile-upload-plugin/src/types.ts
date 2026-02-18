import type { ReadStream } from 'fs';

/**
 * Represents a file upload received from the client.
 */
export interface FileUpload {
  filename: string;
  mimetype?: string;
  encoding?: string;
  createReadStream: () => ReadStream;
}

/**
 * Additional metadata passed to the upload resolver via the info parameter.
 */
export interface UploadPluginInfo {
  tags: Record<string, any>;
  type?: string;
}

/**
 * A function that processes an uploaded file and returns the value to store
 * in the database column (e.g., a URL string or a JSON object).
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
}
