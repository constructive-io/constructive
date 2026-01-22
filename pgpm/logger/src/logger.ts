import yanse from 'yanse';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';
export type LogFormat = 'pretty' | 'json';

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  success: 2,
  warn: 3,
  error: 4
};

const levelColors: Record<LogLevel, typeof yanse.cyan> = {
  info: yanse.cyan,
  warn: yanse.yellow,
  error: yanse.red,
  debug: yanse.gray,
  success: yanse.green
};

const hasAnsi = (text: string): boolean => {
  return typeof text === 'string' && /\u001b\[\d+m/.test(text);
};

const safeStringify = (obj: unknown): string => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return '[Unserializable Object]';
  }
};

const formatArg = (arg: unknown): unknown => {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return arg.stack ?? arg.message;
  if (typeof arg === 'bigint') return arg.toString();
  if (typeof arg === 'object' || typeof arg === 'function') {
    return safeStringify(arg);
  }
  return arg;
};

// Parse LOG_LEVEL from environment
let globalLogLevel: LogLevel =
  (process.env.LOG_LEVEL?.toLowerCase() as LogLevel) ?? 'info';

// Update log level at runtime
export const setLogLevel = (level: LogLevel) => {
  if (levelPriority[level] !== undefined) {
    globalLogLevel = level;
  }
};

// Parse LOG_TIMESTAMP from environment (default: false)
let showTimestamp: boolean =
  process.env.LOG_TIMESTAMP?.toLowerCase() === 'true' ||
  process.env.LOG_TIMESTAMP === '1';

// Update timestamp display at runtime
export const setShowTimestamp = (show: boolean) => {
  showTimestamp = show;
};

// Parse LOG_FORMAT from environment (default: 'pretty')
let logFormat: LogFormat =
  process.env.LOG_FORMAT?.toLowerCase() === 'json' ? 'json' : 'pretty';

// Update log format at runtime
export const setLogFormat = (format: LogFormat) => {
  logFormat = format;
};

// Scope filtering
interface ScopeFilter {
  include: Set<string>;
  exclude: Set<string>;
}

const parseScopeFilter = (env: string | undefined): ScopeFilter => {
  const include = new Set<string>();
  const exclude = new Set<string>();

  (env ?? '').split(',').map(s => s.trim()).forEach(scope => {
    if (!scope) return;
    if (scope === '*') {
      include.add('*');
    } else if (scope.startsWith('^')) {
      exclude.add(scope.slice(1));
    } else {
      include.add(scope);
    }
  });

  return { include, exclude };
};

let { include: allowedScopes, exclude: blockedScopes } = parseScopeFilter(process.env.LOG_SCOPE);

// Update scopes at runtime
export const setLogScopes = (scopes: string[]) => {
  const parsed = parseScopeFilter(scopes.join(','));
  allowedScopes = parsed.include;
  blockedScopes = parsed.exclude;
};

// Logger class
export class Logger {
  private scope: string;

  constructor(scope: string) {
    this.scope = scope;
  }

  private log(level: LogLevel, ...args: any[]) {
    // Respect log level
    if (levelPriority[level] < levelPriority[globalLogLevel]) return;

    // Scope filtering
    if (blockedScopes.has(this.scope)) return;
    if (
      allowedScopes.size > 0 &&
      !allowedScopes.has('*') &&
      !allowedScopes.has(this.scope)
    ) {
      return;
    }

    const stream = level === 'error' ? process.stderr : process.stdout;

    if (logFormat === 'json') {
      // JSON format: structured output for log aggregators
      const entry: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        level,
        scope: this.scope
      };

      // Extract message and data from args
      const strings: string[] = [];
      for (const arg of args) {
        if (typeof arg === 'string') {
          strings.push(arg);
        } else if (arg instanceof Error) {
          if (!entry.error) {
            entry.error = {
              name: arg.name,
              message: arg.message,
              stack: arg.stack
            };
          } else {
            // Preserve additional errors in the message string
            strings.push(`Error[${arg.name}]: ${arg.message}`);
          }
        } else if (typeof arg === 'object' && arg !== null) {
          Object.assign(entry, arg);
        } else if (arg !== undefined && arg !== null) {
          strings.push(String(arg));
        }
      }

      if (strings.length > 0) {
        entry.message = strings.join(' ');
      }

      stream.write(JSON.stringify(entry) + '\n');
      return;
    }

    // Pretty format: colored output for terminals
    const tag = yanse.bold(`[${this.scope}]`);
    const color = levelColors[level];
    const prefix = color(`${level.toUpperCase()}:`);

    const formattedArgs = args.map(arg => {
      const normalized = formatArg(arg);
      return typeof normalized === 'string' && !hasAnsi(normalized)
        ? color(normalized)
        : normalized;
    });

    const outputParts = showTimestamp
      ? [yanse.dim(`[${new Date().toISOString()}]`), tag, prefix, ...formattedArgs]
      : [tag, prefix, ...formattedArgs];
    const output = outputParts
      .map(arg => String(arg))
      .join(' ') + '\n';

    stream.write(output);
  }

  info(...args: any[]) {
    this.log('info', ...args);
  }

  warn(...args: any[]) {
    this.log('warn', ...args);
  }

  error(...args: any[]) {
    this.log('error', ...args);
  }

  debug(...args: any[]) {
    this.log('debug', ...args);
  }

  success(...args: any[]) {
    this.log('success', ...args);
  }
}

// Factory function
export const createLogger = (scope: string) => new Logger(scope);
