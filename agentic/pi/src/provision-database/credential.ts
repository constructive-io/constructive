// Pure: decide which credential authenticates a project's provisioning. Under the
// account gate a signed-in session is guaranteed, so every new project provisions
// UNDER the account (account-owned + enumerable): the database's owner_id is the
// account's own userId, and the account's API key (falling back to its session
// token) is the bearer that authenticates the provision mutation and lands in the
// project .env as ACCESS_TOKEN (refreshed on every provision run, including the
// skip path). A signed-in session with no usable bearer (keychain locked) is an
// explicit error, never a silent throwaway owner.
// Side-effect-free so the branch is unit-testable without runtime/network.

export type AccountCredential = {
  userId: string;
  accessToken: string;
  apiKey?: string;
};

export type ProvisionCredential =
  | { mode: 'account'; ownerId: string; bearer: string }
  | { mode: 'error'; reason: string };

export function selectProvisionCredential(
  account: AccountCredential | null | undefined,
): ProvisionCredential {
  const bearer = account?.apiKey ?? account?.accessToken;
  if (account?.userId && bearer) {
    return { mode: 'account', ownerId: account.userId, bearer };
  }
  return {
    mode: 'error',
    reason:
      'No usable account credential. Sign in (or unlock your session) before provisioning a database.',
  };
}
