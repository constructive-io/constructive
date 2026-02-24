import { Logger } from '@pgpmjs/logger';
import type { PgpmOptions } from '@pgpmjs/types';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { escapeIdentifier } from 'pg';
import type { Pool } from 'pg';
import { getPgPool } from 'pg-cache';
import pgQueryContext from 'pg-query-context';
import { streamToStorage } from 'graphile-settings';
import type { RlsModule } from '../types';
import './types';

const uploadLog = new Logger('upload');
const authLog = new Logger('upload-auth');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const parseFile = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `upload-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE },
}).single('file');

const parseFileWithErrors: RequestHandler = (req, res, next) => {
  parseFile(req, res, (err: any) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)} MB` });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field. Send a single file as "file".' });
    }
    return res.status(400).json({ error: 'File upload failed' });
  });
};

const RLS_MODULE_BY_DATABASE_ID_SQL = `
  SELECT
    rm.authenticate,
    rm.authenticate_strict,
    ps.schema_name as private_schema_name
  FROM metaschema_modules_public.rls_module rm
  LEFT JOIN metaschema_public.schema ps ON rm.private_schema_id = ps.id
  JOIN services_public.apis a ON rm.api_id = a.id
  WHERE a.database_id = $1
  ORDER BY a.id
  LIMIT 1
`;

const RLS_MODULE_BY_API_ID_SQL = `
  SELECT
    rm.authenticate,
    rm.authenticate_strict,
    ps.schema_name as private_schema_name
  FROM metaschema_modules_public.rls_module rm
  LEFT JOIN metaschema_public.schema ps ON rm.private_schema_id = ps.id
  WHERE rm.api_id = $1
  LIMIT 1
`;

const RLS_MODULE_BY_DBNAME_SQL = `
  SELECT
    rm.authenticate,
    rm.authenticate_strict,
    ps.schema_name as private_schema_name
  FROM metaschema_modules_public.rls_module rm
  LEFT JOIN metaschema_public.schema ps ON rm.private_schema_id = ps.id
  JOIN services_public.apis a ON rm.api_id = a.id
  WHERE a.dbname = $1
  ORDER BY a.id
  LIMIT 1
`;

interface RlsModuleRow {
  authenticate: string | null;
  authenticate_strict: string | null;
  private_schema_name: string | null;
}

const toRlsModule = (row: RlsModuleRow | null): RlsModule | undefined => {
  if (!row || !row.private_schema_name) return undefined;
  return {
    authenticate: row.authenticate ?? undefined,
    authenticateStrict: row.authenticate_strict ?? undefined,
    privateSchema: { schemaName: row.private_schema_name },
  };
};

const getBearerToken = (authorization?: string): string | null => {
  if (!authorization) return null;
  const [authType, authToken] = authorization.split(' ');
  if (authType?.toLowerCase() !== 'bearer' || !authToken) {
    return null;
  }
  return authToken;
};

const queryRlsModuleByDatabaseId = async (pool: Pool, databaseId: string): Promise<RlsModule | undefined> => {
  const result = await pool.query<RlsModuleRow>(RLS_MODULE_BY_DATABASE_ID_SQL, [databaseId]);
  return toRlsModule(result.rows[0] ?? null);
};

const queryRlsModuleByApiId = async (pool: Pool, apiId: string): Promise<RlsModule | undefined> => {
  const result = await pool.query<RlsModuleRow>(RLS_MODULE_BY_API_ID_SQL, [apiId]);
  return toRlsModule(result.rows[0] ?? null);
};

const queryRlsModuleByDbname = async (pool: Pool, dbname: string): Promise<RlsModule | undefined> => {
  const result = await pool.query<RlsModuleRow>(RLS_MODULE_BY_DBNAME_SQL, [dbname]);
  return toRlsModule(result.rows[0] ?? null);
};

const resolveUploadRlsModule = async (opts: PgpmOptions, req: Request): Promise<RlsModule | undefined> => {
  const api = req.api;
  if (!api) return undefined;

  // Use API-scoped RLS module when available (e.g., meta API).
  if (api.rlsModule) {
    return api.rlsModule;
  }

  const pool = getPgPool(opts.pg);
  if (api.apiId) {
    const byApiId = await queryRlsModuleByApiId(pool, api.apiId);
    if (byApiId) return byApiId;
  }

  if (api.databaseId) {
    const byDatabaseId = await queryRlsModuleByDatabaseId(pool, api.databaseId);
    if (byDatabaseId) return byDatabaseId;
  }

  if (api.dbname) {
    return queryRlsModuleByDbname(pool, api.dbname);
  }

  return undefined;
};

const authError = (res: Response): Response =>
  res.status(401).json({ error: 'Authentication required' });

/**
 * Upload-specific authentication middleware.
 *
 * This middleware enforces strict auth semantics for `POST /upload` while
 * preserving existing GraphQL auth behavior for other routes.
 */
export const createUploadAuthenticateMiddleware = (
  opts: PgpmOptions,
): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const api = req.api;
    if (!api) {
      res.status(500).send('Missing API info');
      return;
    }

    if (req.token?.user_id) {
      next();
      return;
    }

    const authToken = getBearerToken(req.headers.authorization as string | undefined);
    if (!authToken) {
      authError(res);
      return;
    }

    let rlsModule: RlsModule | undefined;
    try {
      rlsModule = await resolveUploadRlsModule(opts, req);
    } catch (error) {
      authLog.error('[upload-auth] Failed to resolve RLS module for upload route', error);
      authError(res);
      return;
    }

    if (!rlsModule) {
      authLog.info(`[upload-auth] No RLS module found for db=${api.dbname} databaseId=${api.databaseId ?? 'none'}`);
      authError(res);
      return;
    }

    const authFn = opts.server?.strictAuth ? rlsModule.authenticateStrict : rlsModule.authenticate;
    const privateSchema = rlsModule.privateSchema?.schemaName;
    if (!authFn || !privateSchema) {
      authLog.warn(
        `[upload-auth] Missing auth function or private schema for db=${api.dbname}; strictAuth=${opts.server?.strictAuth ?? false}`,
      );
      authError(res);
      return;
    }

    const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;
    if (!SAFE_IDENTIFIER.test(privateSchema) || !SAFE_IDENTIFIER.test(authFn)) {
      authLog.error(`[upload-auth] Invalid SQL identifier: schema=${privateSchema} fn=${authFn}`);
      authError(res);
      return;
    }

    const pool = getPgPool({
      ...opts.pg,
      database: api.dbname,
    });

    const context: Record<string, string> = {};
    if (req.clientIp) {
      context['jwt.claims.ip_address'] = req.clientIp;
    }
    if (req.get('origin')) {
      context['jwt.claims.origin'] = req.get('origin') as string;
    }
    if (req.get('User-Agent')) {
      context['jwt.claims.user_agent'] = req.get('User-Agent') as string;
    }

    try {
      const result = await pgQueryContext({
        client: pool,
        context,
        query: `SELECT * FROM ${escapeIdentifier(privateSchema)}.${escapeIdentifier(authFn)}($1)`,
        variables: [authToken],
      });

      if (!result?.rowCount) {
        authError(res);
        return;
      }

      req.token = result.rows[0];
      if (!req.token?.user_id) {
        authError(res);
        return;
      }

      next();
    } catch (error) {
      authLog.warn('[upload-auth] Upload authentication failed', error);
      authError(res);
    }
  };
};

/**
 * REST file upload endpoint.
 *
 * Accepts a single file via multipart/form-data, streams it to S3/MinIO,
 * and returns file metadata. The frontend uses this in a two-step flow:
 *
 * 1. POST /upload  -> { url, filename, mime, size }
 * 2. GraphQL mutation -> patch row with the returned metadata
 */
export const uploadRoute: RequestHandler[] = [
  parseFileWithErrors,
  (async (req, res) => {
    if (!req.token?.user_id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided. Send a "file" field.' });
    }

    try {
      const readStream = fs.createReadStream(req.file.path);
      const result = await streamToStorage(readStream, req.file.originalname);

      uploadLog.debug(
        `[upload] Uploaded file for user=${req.token.user_id} filename=${req.file.originalname} mime=${result.mime} size=${req.file.size}`,
      );

      res.json({
        url: result.url,
        filename: result.filename,
        mime: result.mime,
        size: req.file.size,
      });
    } finally {
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {});
      }
    }
  }) as RequestHandler,
];
