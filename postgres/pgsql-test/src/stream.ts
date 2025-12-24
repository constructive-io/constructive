import { spawn } from 'child_process';
import { getSpawnEnvWithPg,PgConfig } from 'pg-env';
import { Readable } from 'stream';

function setArgs(config: PgConfig): string[] {
  const args = [
    '-U', config.user,
    '-h', config.host,
    '-d', config.database
  ];
  if (config.port) {
    args.push('-p', String(config.port));
  }
  return args;
}

// Converts a string to a readable stream (replaces streamify-string)
function stringToStream(text: string): Readable {
  const stream = new Readable({
    read() {
      this.push(text);
      this.push(null);
    }
  });
  return stream;
}

/**
 * Executes SQL statements by streaming them to psql.
 * 
 * IMPORTANT: PostgreSQL stderr handling
 * -------------------------------------
 * PostgreSQL sends different message types to stderr, not just errors:
 *   - ERROR: Actual SQL errors (should fail)
 *   - WARNING: Potential issues (informational)
 *   - NOTICE: Informational messages (should NOT fail)
 *   - INFO: Informational messages (should NOT fail)
 *   - DEBUG: Debug messages (should NOT fail)
 * 
 * Example scenario that previously caused false failures:
 * When running SQL like:
 *   GRANT administrator TO app_user;
 * 
 * If app_user is already a member of administrator, PostgreSQL outputs:
 *   NOTICE: role "app_user" is already a member of role "administrator"
 * 
 * This is NOT an error - the GRANT succeeded (it's idempotent). But because
 * this message goes to stderr, the old implementation would reject the promise
 * and fail the test, even though nothing was wrong.
 * 
 * Solution:
 * 1. Buffer stderr instead of rejecting immediately on any output
 * 2. Use ON_ERROR_STOP=1 so psql exits with non-zero code on actual SQL errors
 * 3. Only reject if the exit code is non-zero, using buffered stderr as the error message
 * 
 * This way, NOTICE/WARNING messages are collected but don't cause failures,
 * while actual SQL errors still properly fail with meaningful error messages.
 */
export async function streamSql(config: PgConfig, sql: string): Promise<void> {
  const args = [
    ...setArgs(config),
    // ON_ERROR_STOP=1 makes psql exit with a non-zero code when it encounters
    // an actual SQL error. Without this, psql might continue executing subsequent
    // statements and exit with code 0 even if some statements failed.
    '-v', 'ON_ERROR_STOP=1'
  ];

  return new Promise<void>((resolve, reject) => {
    const sqlStream = stringToStream(sql);
    
    // Buffer stderr instead of rejecting immediately. This allows us to collect
    // all output (including harmless NOTICE messages) and only use it for error
    // reporting if the process actually fails.
    let stderrBuffer = '';

    const proc = spawn('psql', args, {
      env: getSpawnEnvWithPg(config)
    });

    sqlStream.pipe(proc.stdin);

    // Collect stderr output. We don't reject here because stderr may contain
    // harmless NOTICE/WARNING messages that shouldn't cause test failures.
    proc.stderr.on('data', (data: Buffer) => {
      stderrBuffer += data.toString();
    });

    // Determine success/failure based on exit code, not stderr content.
    // Exit code 0 = success (even if there were NOTICE messages on stderr)
    // Exit code non-zero = actual error occurred
    proc.on('close', (code) => {
      if (code !== 0) {
        // Include the buffered stderr in the error message for debugging
        reject(new Error(stderrBuffer || `psql exited with code ${code}`));
      } else {
        resolve();
      }
    });

    // Handle spawn errors (e.g., psql not found)
    proc.on('error', (error) => {
      reject(error);
    });
  });
}
