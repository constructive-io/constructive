import { Logger } from '@pgpmjs/logger';
import { PgpmError } from '@pgpmjs/types';

const log = new Logger('cli');

/**
 * CLI error utility that logs error information and exits with code 1.
 * Provides consistent error handling and user experience across all CLI commands.
 */
export const cliExitWithError = async (
  error: PgpmError | Error | string,
  context?: Record<string, any>
): Promise<never> => {
  if (error instanceof PgpmError) {
    log.error(`Error: ${error.message}`);
    
    if (error.context && Object.keys(error.context).length > 0) {
      log.debug('Error context:', error.context);
    }
    
    if (context) {
      log.debug('Additional context:', context);
    }
  } else if (error instanceof Error) {
    log.error(`Error: ${error.message}`);
    if (context) {
      log.debug('Context:', context);
    }
  } else if (typeof error === 'string') {
    log.error(`Error: ${error}`);
    if (context) {
      log.debug('Context:', context);
    }
  }

  process.exit(1);
};
