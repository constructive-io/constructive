// Pure .env merge — used by provision_database to persist provisioning
// credentials without clobbering existing keys: replace a key in place if
// present, else append.
// Kept side-effect-free so it is unit-testable (the tool does the fs write).

export type EnvVars = Record<string, string>;

/**
 * Upsert `vars` into the existing `.env` `content`. Existing keys are replaced
 * in place (preserving surrounding lines/comments); new keys are appended.
 * Returns the new file body, trailing-newline-terminated.
 */
export function mergeEnv(content: string, vars: EnvVars): string {
  let out = content;
  for (const [key, val] of Object.entries(vars)) {
    // Escape the key for the regex, and use a replacement function so `$`
    // sequences in the value are never treated as replacement specials.
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escapedKey}=.*`, 'm');
    if (regex.test(out)) out = out.replace(regex, () => `${key}=${val}`);
    else out += `\n${key}=${val}`;
  }
  return out.trim() + '\n';
}

/** The credential keys provision_database owns in a project's .env. */
export const PROVISION_ENV_KEYS = [
  'DATABASE_ID',
  'DATABASE_NAME',
  'OWNER_ID',
  'ACCESS_TOKEN',
  'PGDATABASE',
  'API_ENDPOINT',
  'MODULES_ENDPOINT',
] as const;

/**
 * Keys archived as comments on reprovision — the binding identity: which
 * database, under whom, on which backend. ACCESS_TOKEN is the account login
 * token, identical across bindings, so it is overwritten in place rather than
 * archived.
 */
export const ARCHIVED_BINDING_KEYS = [
  'DATABASE_ID',
  'DATABASE_NAME',
  'OWNER_ID',
  'PGDATABASE',
  'API_ENDPOINT',
  'MODULES_ENDPOINT',
] as const;

/**
 * Build the provisioning credential block written to a project's .env. The
 * endpoint pins record which backend owns this binding — outside-app consumers
 * (verify-feature.sh, skill scripts, dev-server shells) resolve them instead of
 * falling back to localhost defaults when the app targets a hosted backend.
 */
export function provisionEnvVars(args: {
  databaseId: string;
  databaseName: string;
  ownerId: string;
  accessToken: string;
  apiEndpoint: string;
  modulesEndpoint: string;
}): EnvVars {
  return {
    DATABASE_ID: args.databaseId,
    DATABASE_NAME: args.databaseName,
    OWNER_ID: args.ownerId,
    ACCESS_TOKEN: args.accessToken,
    PGDATABASE: args.databaseName,
    API_ENDPOINT: args.apiEndpoint,
    MODULES_ENDPOINT: args.modulesEndpoint,
  };
}

/**
 * Comment out the given keys in place (`# archived <date>: KEY=value`) so a
 * reprovision keeps the previous binding readable in the file instead of
 * silently overwriting it. Every other line — including existing comments and
 * already-archived entries — passes through untouched.
 */
export function archiveBindingKeys(
  content: string,
  keys: readonly string[],
  archivedOn: string,
): string {
  const keySet = new Set(keys);
  return content
    .split('\n')
    .map((line) => {
      if (line.trimStart().startsWith('#')) return line;
      const eq = line.indexOf('=');
      if (eq === -1) return line;
      const key = line.slice(0, eq).trim();
      return keySet.has(key) ? `# archived ${archivedOn}: ${line.trim()}` : line;
    })
    .join('\n');
}
