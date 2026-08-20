import { Logger } from '@pgpmjs/logger';
import type { RequestHandler } from 'express';
import {
  getDebugMemorySnapshot,
  type DebugMemoryRuntimeOptions,
} from '../../diagnostics/debug-memory-snapshot';

const log = new Logger('debug-memory');

export const createDebugMemoryMiddleware =
  (runtime: DebugMemoryRuntimeOptions = {}): RequestHandler =>
  (_req, res) => {
    const response = getDebugMemorySnapshot(runtime);

    log.debug('Memory snapshot:', response);
    res.json(response);
  };

export const debugMemory: RequestHandler = createDebugMemoryMiddleware();
