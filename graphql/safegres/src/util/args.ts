/**
 * Minimal argv parser. Supports:
 *   --flag value
 *   --flag=value
 *   --boolean (no arg)
 *   positional args
 *
 * We deliberately avoid commander/yargs to keep runtime dependencies zero.
 */

export interface ParsedArgs {
  command: string | null;
  positional: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { command: null, positional: [], flags: {} };
  let i = 0;
  if (argv[0] && !argv[0].startsWith('-')) {
    out.command = argv[0];
    i = 1;
  }
  for (; i < argv.length; i++) {
    const tok = argv[i];
    if (!tok.startsWith('--')) {
      out.positional.push(tok);
      continue;
    }
    const body = tok.slice(2);
    const eq = body.indexOf('=');
    if (eq !== -1) {
      out.flags[body.slice(0, eq)] = body.slice(eq + 1);
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out.flags[body] = true;
    } else {
      out.flags[body] = next;
      i += 1;
    }
  }
  return out;
}

export function stringFlag(flags: Record<string, string | boolean>, key: string): string | undefined {
  const v = flags[key];
  if (typeof v === 'string' && v.length > 0) return v;
  return undefined;
}

export function listFlag(flags: Record<string, string | boolean>, key: string): string[] | undefined {
  const s = stringFlag(flags, key);
  if (!s) return undefined;
  return s.split(',').map((p) => p.trim()).filter(Boolean);
}

export function boolFlag(flags: Record<string, string | boolean>, key: string): boolean {
  return flags[key] === true || flags[key] === 'true';
}
