// Pure: read the database binding the provision_database tool writes into a
// project's .env (DATABASE_ID/OWNER_ID/DATABASE_NAME). Returns null until
// DATABASE_ID is present — the binding isn't real without it. Kept free of any
// runtime/fs coupling so it stays unit-testable (the caller does the read).

export type ProvisionedBinding = {
  databaseId: string;
  ownerId?: string;
  databaseName?: string;
};

export function parseProvisionedBinding(envSource: string): ProvisionedBinding | null {
  const env: Record<string, string> = {};
  for (const rawLine of envSource.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  if (!env.DATABASE_ID) return null;
  return {
    databaseId: env.DATABASE_ID,
    ...(env.OWNER_ID ? { ownerId: env.OWNER_ID } : {}),
    ...(env.DATABASE_NAME ? { databaseName: env.DATABASE_NAME } : {}),
  };
}

/** Another account than the signed-in one owns the binding; false when either is unknown. */
export const ownedByAnother = (ownerId: string | undefined, userId: string | undefined) =>
  Boolean(ownerId && userId && ownerId !== userId);
