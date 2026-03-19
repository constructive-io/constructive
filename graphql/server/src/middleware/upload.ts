import { Logger } from '@pgpmjs/logger';
import type { PgpmOptions } from '@pgpmjs/types';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { QuoteUtils } from '@pgsql/quotes';
import type { Pool } from 'pg';
import { getPgPool } from 'pg-cache';
import pgQueryContext from 'pg-query-context';
import { streamToStorage } from 'graphile-settings';
import type { RlsModule } from '../types';
import './types';

const uploadLog = new Logger('upload');
const authLog = new Logger('upload-auth');

const envFileSize = process.env.MAX_UPLOAD_FILE_SIZE
  ? parseInt(process.env.MAX_UPLOAD_FILE_SIZE, 10)
  : NaN;
const MAX_FILE_SIZE = envFileSize > 0 ? envFileSize : 10 * 1024 * 1024;

const BLOCKED_MIME_TYPES = new Set([
  'application/x-executable',
  'application/x-sharedlib',
  'application/x-mach-binary',
  'application/x-dosexec',
  'text/html',
  'application/xhtml+xml',
  'application/javascript',
  'text/javascript'
]);

const parseFile = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, _file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `upload-${uniqueSuffix}.tmp`);
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
  SELECT am.data
  FROM services_public.api_modules am
  JOIN services_public.apis a ON am.api_id = a.id
  WHERE am.name = 'rls_module' AND a.database_id = $1
  ORDER BY a.id
  LIMIT 1
`;

const RLS_MODULE_BY_API_ID_SQL = `
  SELECT data
  FROM services_public.api_modules
  WHERE api_id = $1 AND name = 'rls_module'
  LIMIT 1
`;

const RLS_MODULE_BY_DBNAME_SQL = `
  SELECT am.data
  FROM services_public.api_modules am
  JOIN services_public.apis a ON am.api_id = a.id
  WHERE am.name = 'rls_module' AND a.dbname = $1
  ORDER BY a.id
  LIMIT 1
`;

interface RlsModuleData {
  authenticate: string;
  authenticate_strict: string;
  authenticate_schema: string;
  role_schema: string;
  current_role: string;
  current_role_id: string;
  current_ip_address: string;
  current_user_agent: string;
}

interface RlsModuleRow {
  data: RlsModuleData | null;
}

const toRlsModule = (row: RlsModuleRow | null): RlsModule | undefined => {
  if (!row?.data) return undefined;
  const d = row.data;
  return {
    authenticate: d.authenticate,
    authenticateStrict: d.authenticate_strict,
    privateSchema: { schemaName: d.authenticate_schema },
    publicSchema: { schemaName: d.role_schema },
    currentRole: d.current_role,
    currentRoleId: d.current_role_id,
    currentIpAddress: d.current_ip_address,
    currentUserAgent: d.current_user_agent,
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
        query: `SELECT * FROM ${QuoteUtils.quoteQualifiedIdentifier(privateSchema, authFn)}($1)`,
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
 * 1. POST /upload  -> { key?, url, filename, mime, size }
 * 2. GraphQL mutation -> patch row with the returned metadata
 *
 * When UPLOAD_V2_ENABLED=true, passes databaseId and userId to streamToStorage
 * so it can use the new key format and INSERT into files_store_public.files.
 */
export const uploadRoute: RequestHandler[] = [
  parseFileWithErrors,
  (async (req, res, next) => {
    if (!req.token?.user_id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided. Send a "file" field.' });
    }

    if (req.file.mimetype && BLOCKED_MIME_TYPES.has(req.file.mimetype)) {
      fs.unlink(req.file.path, () => {});
      return res.status(415).json({ error: 'File type not allowed' });
    }

    try {
      const readStream = fs.createReadStream(req.file.path);

      // Source back-reference from form fields (optional).
      // Dashboard sends GraphQL-level names; we resolve PG-level names via metaschema.
      const gqlTableName = req.body?.source_table;   // GraphQL type, e.g. "Photo"
      const gqlColumnName = req.body?.source_column;  // GraphQL field, e.g. "img"
      const sourceId = req.body?.source_id;           // Row UUID
      let source: { table: string; column: string; id: string } | null = null;

      if (gqlTableName && gqlColumnName && sourceId && req.api?.databaseId) {
        try {
          const pgCacheModule = await import('pg-cache');
          const pool = pgCacheModule.getPgPool({
            host: process.env.PGHOST || 'localhost',
            port: Number(process.env.PGPORT || 5432),
            database: process.env.PGDATABASE || 'constructive',
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD || 'password',
          });
          // Look up PG schema.table from metaschema.
          // s.schema_name is the physical PG schema (e.g. "testdb-31d39e18-app-public").
          // Try exact match on lowercase plural (Photo → photos), then singular.
          const candidates = [
            gqlTableName.toLowerCase() + 's',  // Photo → photos
            gqlTableName.toLowerCase(),         // Photo → photo
          ];
          const { rows } = await pool.query(
            `SELECT s.schema_name AS pg_schema, t.name AS table_name
             FROM metaschema_public."table" t
             JOIN metaschema_public.schema s ON s.id = t.schema_id
             WHERE s.database_id = $1
             AND t.name = ANY($2)
             LIMIT 1`,
            [req.api.databaseId, candidates]
          );
          if (rows.length > 0 && rows[0].pg_schema) {
            source = {
              table: `${rows[0].pg_schema}.${rows[0].table_name}`,
              column: gqlColumnName,
              id: sourceId,
            };
          }
        } catch (resolveErr) {
          uploadLog.debug('[upload] Failed to resolve source back-reference', resolveErr);
        }
      }

      const result = await streamToStorage(readStream, req.file.originalname, {
        databaseId: req.api?.databaseId,
        userId: req.token.user_id,
        bucketKey: 'default',
        source,
      });

      uploadLog.debug(
        `[upload] Uploaded file for user=${req.token.user_id} filename=${req.file.originalname} mime=${result.mime} size=${req.file.size}`,
      );

      res.json({
        ...(result.key ? { key: result.key } : {}),
        url: result.url,
        filename: result.filename,
        mime: result.mime,
        size: req.file.size,
      });
    } catch (error) {
      uploadLog.error('[upload] Upload processing failed', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Upload processing failed' });
      }
    } finally {
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {});
      }
    }
  }) as RequestHandler,
];
