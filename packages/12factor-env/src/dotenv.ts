// ── Opt-in dotenv support (node-only entry point) ────────────────────────────
//
// This module is deliberately NOT re-exported from `12factor-env`'s main entry:
// it imports node builtins (`node:fs`, `node:util`), and the main entry must
// stay dependency-pure so it can be bundled for a browser, an Electron
// renderer, or a Next.js client component. Import it explicitly from code that
// runs in node:
//
//   import { dotenv } from '12factor-env/dotenv';
//   import { env, str } from '12factor-env';
//
//   const config = env(dotenv(), { DATABASE_URL: str() });
//
// The 12-factor rule is "environment first, `.env` as a local-dev convenience":
// a container gets its configuration from the process environment, while a
// developer's project folder may carry a `.env`. `dotenv()` produces an
// environment record honoring that rule — file values fill gaps, real
// environment variables win (unless `override` is set). It is a pure input
// builder for `env()`/`cleanEnv`; it never mutates `process.env`.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseEnv as parseEnvSource } from 'node:util';

export type DotenvOptions = {
  /** Explicit path to the env file. Takes precedence over `cwd`/`file`. */
  path?: string;
  /** Directory to resolve `file` in. Default: `process.cwd()`. */
  cwd?: string;
  /** File name resolved under `cwd`. Default: `.env`. */
  file?: string;
  /** Base environment the file is merged into. Default: `process.env`. */
  environment?: Record<string, string | undefined>;
  /** When true, file values win over the base environment. Default: false. */
  override?: boolean;
};

/** Parse dotenv-format source text into a plain record (no interpolation). */
export const parseDotenv = (source: string): Record<string, string> =>
  parseEnvSource(source) as Record<string, string>;

/**
 * Read an env file and merge it with an environment record. A missing file is
 * not an error — the base environment is returned unchanged, so the same code
 * path works in a container (no file) and in local dev (file present).
 */
export const dotenv = (
  options: DotenvOptions = {}
): Record<string, string | undefined> => {
  const {
    environment = process.env,
    override = false,
    cwd = process.cwd(),
    file = '.env'
  } = options;
  const filePath = options.path ?? path.join(cwd, file);

  let source: string;
  try {
    source = readFileSync(filePath, 'utf8');
  } catch {
    return { ...environment };
  }

  const fileVars = parseDotenv(source);
  return override
    ? { ...environment, ...fileVars }
    : { ...fileVars, ...environment };
};
