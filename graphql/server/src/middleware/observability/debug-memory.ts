import { Logger } from '@pgpmjs/logger';
import type { RequestHandler } from 'express';
import { getDebugMemorySnapshot } from '../../diagnostics/debug-memory-snapshot';

const log = new Logger('debug-memory');

export const debugMemory: RequestHandler = (_req, res) => {
  const response = getDebugMemorySnapshot();

  log.debug('Memory snapshot:', response);
  res.json(response);
};
