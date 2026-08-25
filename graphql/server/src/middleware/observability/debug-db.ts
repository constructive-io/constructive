import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import type { RequestHandler } from 'express';
import {
  getDebugDatabaseSnapshot,
  type DebugDatabaseRuntimeOptions,
} from '../../diagnostics/debug-db-snapshot';

const log = new Logger('debug-db');

export const createDebugDatabaseMiddleware = (
  opts: ConstructiveOptions,
  runtime: DebugDatabaseRuntimeOptions = {}
): RequestHandler => {
  return async (_req, res) => {
    try {
      const response = await getDebugDatabaseSnapshot(opts, runtime);

      log.debug('Database debug snapshot', {
        activeActivity: response.activeActivity.length,
        blockedActivity: response.blockedActivity.length,
        lockSummary: response.lockSummary.length,
      });

      res.json(response);
    } catch (error) {
      log.error('Failed to fetch debug DB snapshot', error);
      res.status(500).json({
        error: 'Failed to fetch database debug snapshot',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
};
