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

export async function streamSql(config: PgConfig, sql: string): Promise<void> {
  const args = [
    ...setArgs(config),
    '-v', 'ON_ERROR_STOP=1'  // Exit with non-zero code on SQL errors
  ];

  return new Promise<void>((resolve, reject) => {
    const sqlStream = stringToStream(sql);
    let stderrBuffer = '';

    const proc = spawn('psql', args, {
      env: getSpawnEnvWithPg(config)
    });

    sqlStream.pipe(proc.stdin);

    proc.stderr.on('data', (data: Buffer) => {
      stderrBuffer += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderrBuffer || `psql exited with code ${code}`));
      } else {
        resolve();
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}
