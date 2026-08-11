# @constructive-io/oauth

Protocol primitives and Provider adapters for Constructive OAuth/OIDC sign-in.

The package owns:

- cryptographically random OAuth state, OIDC nonce, and RFC 7636 S256 PKCE;
- authorization URL construction with protected parameters;
- exact Provider endpoint allowlists and bounded, no-redirect JSON requests;
- a protocol-neutral `ProviderAdapter` contract;
- registered Google/OIDC and GitHub/OAuth adapter implementations; and
- safe normalized external identities without raw Provider payloads or tokens.

It deliberately does not own Express routes, Cookies, Tenant resolution,
database state, account association, Constructive credentials, or Site handoff.
Those remain in their Constructive orchestration owners.

## Security model

Every Provider flow uses Authorization Code with S256 PKCE. Constructive creates
and persists the state, verifier, and optional nonce before navigation. Only the
state and S256 challenge reach the browser. The callback supplies the code to
Constructive, and the selected adapter exchanges it with the original
server-held verifier.

Provider configuration is supplied by the caller after Tenant-scoped loader
resolution. Adapters do not read environment variables or databases. Endpoints
must match the concrete adapter's HTTPS allowlist, requests reject redirects,
and Provider response bodies are never included in errors.

## Example

```ts
import {
  deriveS256CodeChallenge,
  generateCodeVerifier,
  generateOidcNonce,
  generateOpaqueState,
  getProviderAdapter
} from '@constructive-io/oauth';

const adapter = getProviderAdapter(provider.slug);
const config = adapter.validateConfiguration(provider);
const state = generateOpaqueState();
const codeVerifier = generateCodeVerifier();
const nonce = adapter.kind === 'google' ? generateOidcNonce() : undefined;

const { url } = adapter.createAuthorizationRequest({
  config,
  redirectUri,
  state,
  codeChallenge: deriveS256CodeChallenge(codeVerifier),
  nonce
});
```

The common service persists the request artifacts before using `url`. It later
calls `completeAuthorization` with the callback code and server-held artifacts,
then consumes only the returned `NormalizedExternalIdentity`.

## Legacy surface

The previous hard-coded Provider registry, Express middleware,
`/auth/providers` discovery handler, browser state Cookie, and raw profile
payload are intentionally not part of this API. Provider discovery belongs to
Tenant-scoped GraphQL, and replay protection belongs to persisted server state.

## License

MIT
