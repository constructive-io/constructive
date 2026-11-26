import { type AccountSession, type ConfigStore, readBackend, saveSession } from '@agentic-kit/session';

/**
 * Signs the context `name` (default: the active one) in as a sign-in stores it: issued for the context's own five
 * endpoints, so the session is used. `account` replaces any field of the default account.
 */
export function storeSignedIn(store: ConfigStore, name: string = store.getCurrentContext()?.name, account: Partial<AccountSession> = {}): void {
  const context = readBackend(store, name);
  if (context?.status !== 'complete') throw new Error(`The test context "${name}" is not a complete backend, so no sign-in can be stored for it.`);
  saveSession(store, { userId: 'u1', email: 'dev@example.com', accessToken: 'token', signedInAt: 1, issuedFor: context.backend, ...account }, name);
}
