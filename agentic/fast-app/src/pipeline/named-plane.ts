import { deriveSubdomainEndpoint } from '@agentic-kit/db-tools/context';

// The desktop reaches a database at `api-<name>` (and `auth-`, `storage-`) on
// the configured backend, because it provisions each database with its name as
// the subdomain. A database made elsewhere, for example in the dashboard, gets a
// generated label instead, so its named host doesn't exist and answers 404.

const PROBE_TIMEOUT_MS = 5000;

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/** True when `api-<name>` on this backend is a live host; a network failure counts as live. */
export async function namedPlaneAnswers(
  apiEndpoint: string,
  databaseName: string,
  fetchImpl: FetchLike = fetch,
): Promise<boolean> {
  const endpoint = deriveSubdomainEndpoint(apiEndpoint, `api-${databaseName}`);
  if (!endpoint) return false;
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return response.status !== 404;
  } catch {
    // Unreachable says nothing about the name, so keep the old behavior: adopt.
    return true;
  }
}
