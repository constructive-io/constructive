/**
 * Minimal, dependency-free argv parsing + coercions.
 *
 * Port of `scripts/scale-validate/_lib.mjs` `parseArgs` — but folded into a
 * single `Argv` shape where positionals land in `_` (the convention the CLI
 * router and every command reads).
 *
 *   --flag value | --flag=value | --flag (boolean true) ; positionals -> _
 */

export type Argv = Record<string, any> & { _: string[] };

export function parseArgv(raw: string[]): Argv {
  const args: Argv = { _: [] };
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        args[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const key = a.slice(2);
        const next = raw[i + 1];
        if (next === undefined || next.startsWith('--')) {
          args[key] = true;
        } else {
          args[key] = next;
          i++;
        }
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

export function asBool(v: any, dflt = false): boolean {
  if (v === undefined || v === null) return dflt;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

export function asInt(v: any, dflt?: number): number {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}

export function asFloat(v: any, dflt?: number): number {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : dflt;
}

/**
 * Print a usage string (to stderr — stdout is reserved for the machine-readable
 * JSON/JSONL protocol) and return the intended exit code so callers can do
 * `return usageExit(USAGE)` / `process.exitCode = usageExit(USAGE, 0)`.
 */
export function usageExit(usage: string, code = 1): number {
  console.error(usage);
  return code;
}
