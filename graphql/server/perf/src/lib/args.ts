import type { ParsedArgs } from '../types';

export function parseArgs(raw: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Map<string, string | boolean>();

  for (let i = 0; i < raw.length; i += 1) {
    const token = raw[i];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    const eq = token.indexOf('=');
    if (eq !== -1) {
      flags.set(token.slice(0, eq), token.slice(eq + 1));
      continue;
    }

    const next = raw[i + 1];
    if (next != null && !next.startsWith('--')) {
      flags.set(token, next);
      i += 1;
    } else {
      flags.set(token, true);
    }
  }

  return { positionals, flags, raw };
}

export function hasFlag(flags: Map<string, string | boolean>, name: string): boolean {
  return flags.has(name) && flags.get(name) !== false;
}

export function getStringFlag(
  flags: Map<string, string | boolean>,
  name: string,
  fallback?: string,
): string | undefined {
  const value = flags.get(name);
  if (typeof value === 'string') return value;
  return fallback;
}

export function getNumberFlag(
  flags: Map<string, string | boolean>,
  name: string,
  fallback: number,
): number {
  const value = getStringFlag(flags, name);
  if (value == null || value.length === 0) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseCsv(value: string | undefined, fallback: string[]): string[] {
  if (value == null || value.trim().length === 0) return fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function mapAliases(args: string[], aliases: Record<string, string>): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token.startsWith('--') && token.includes('=')) {
      const [name, value] = token.split(/=(.*)/s, 2);
      out.push(`${aliases[name] ?? name}=${value}`);
      continue;
    }
    out.push(aliases[token] ?? token);
  }
  return out;
}
