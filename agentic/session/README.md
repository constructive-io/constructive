# @agentic-kit/session

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@agentic-kit/session"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=agentic%2Fsession%2Fpackage.json"/></a>
</p>

The Constructive sign-in that every binary shares: backend contexts, email and password sign-in, the stored session, agent credentials, and the `CONSTRUCTIVE_*` environment overrides. A sign-in through one binary (the `agent` CLI, the `constructive` CLI, the desktop app) is a sign-in through all of them, because they all read the same [appstash](https://github.com/constructive-io/appstash) store under the stash name `constructive`. The package has no coding-agent SDK and ships no backend URL.

```bash
npm install @agentic-kit/session
```

## The session

`resolveSession({ context?, env?, store? })` answers "who talks to which backend" once, from the environment and the store together, and returns one of seven states:

| `kind` | Meaning |
| --- | --- |
| `no-backend` | No context is chosen (`context: null`), or the named one does not exist |
| `incomplete-backend` | The stored context lacks planes (`missing`), for example one another app wrote; no plane is filled in |
| `invalid-override` | An environment variable is missing, empty or wrong; `variable`, `problem` and `fix` say which and what to do |
| `conflict` | A `context` was named, but an environment variable (`variable`) decides the session; drop one of the two |
| `issuer-mismatch` | A session is stored under the context, but it was issued for another backend (`differs` names the planes whose endpoints changed; `issuedFor` is what it was issued for), or it does not record its backend (`issuedFor: null`); it is never used or sent, and a new sign-in replaces it |
| `signed-out` | A usable backend (`source: 'env'` or `'store'`) and no credential for it |
| `signed-in` | The backend, the account and its key, all from one source |

A credential is only paired with the backend of its own source. Every stored session records the whole backend it was issued for (`issuedFor`, all five endpoints), and it is used only while the context it is filed under names exactly those five endpoints; the compare is exact, so a trailing slash or another letter case is a difference. The session also keeps `authEndpoint`, the field Constructive Desktop reads and writes, so Desktop still sees which auth plane issued it. A session that records only `authEndpoint`, as Desktop writes it, or nothing, cannot show which api, modules, agent and compute endpoints it belongs to: it is never used, and a new sign-in replaces it. Its key can still be revoked, at the recorded `authEndpoint` only, since that is where the token came from. A stored session is used with the endpoints of the context it is filed under, and never with a backend that `CONSTRUCTIVE_API_ENDPOINT` names, unless the override names exactly that context's backend. An environment credential needs the backend from the environment too. `sessionToolsHost({ signInHint, repairHint?, context?, env? })` builds the host of [`@agentic-kit/db-tools`](https://www.npmjs.com/package/@agentic-kit/db-tools) on it. It resolves again on every call, so a sign-in mid-session is picked up. With no backend, `backendConfig()` is undefined and `account()` is null; signed out, `backendConfig()` gives the backend and `account()` is null; for `issuer-mismatch`, `backendConfig()` gives the backend and `account()` throws `sessionProblem`, which names the planes that differ. For `invalid-override`, `conflict` and `incomplete-backend` both getters throw an `Error` with `sessionProblem(session, repairHint)`, the problem and its fix, and a store that cannot be read throws its own error. The db tools turn such a throw into a failure that carries the message. `repairHint` is the binary's command that stores a complete context, for example ``Run `agent login` to store a complete backend.``

```ts
import { createConstructiveDbTools } from '@agentic-kit/db-tools';
import { sessionToolsHost } from '@agentic-kit/session';

const tools = createConstructiveDbTools(sessionToolsHost({ signInHint: 'Run `constructive login` to sign in.' }));
```

## Signing in and out

```ts
import { backendFromEndpoints, keyEndsSoon, openStore, resolveSession, signIn, signOut, verifySession } from '@agentic-kit/session';

const store = openStore();
const backend = backendFromEndpoints({ api: 'https://api.example.com/graphql' });
const { session, apiKey, previousKey } = await signIn({ store, backend, email, password });

const resolved = resolveSession({ store });
if (resolved.kind === 'signed-in') {
  await verifySession(resolved); // accepted | rejected | unchecked
  if (resolved.account.key.kind === 'active' && keyEndsSoon({ expiresAt: resolved.account.key.expiresAt })) {
    // ask the person to sign in again
  }
}
const result = await signOut({ store, session: resolved });
```

`signIn` signs in and mints a 30-day API key inside the fresh step-up window before it writes anything. Then it revokes the key of the session it replaces (`previousKey`), ends the password sign-in on the server (the auth `signOut` mutation), and stores the backend, the session and the choice of context, in that order, filed under `context` when the caller passes one. The stored bearer is the key, so no password sign-in session is left behind. The new session records its issuer. A sign-in that ends with no key (none minted, and none of the replaced session kept) throws a `SignInError` and stores nothing. A failed sign-in throws a `SignInError` whose `kind` is `invalid-input`, `invalid-credentials`, `second-factor-required`, `refused` (a locked account, too many attempts, a disabled method; `code` is the server's), `backend-unreachable` or `server-error`, and leaves the store as it was. The mint and the revoke have the same 10 s timeout as the sign-in.

`signOut({ store, session })` acts on exactly the session `resolveSession` gave, so a CLI's `logout` removes what its `whoami` reported. It revokes the API key at the auth endpoint the credential records (from `issuedFor`, else Desktop's `authEndpoint`), with that credential's own bearer, never at whatever the context names now. It clears the stored session in every state and returns `{ kind: 'cleared', key }`, where `key` says whether the API key was `revoked`, `absent`, or `failed` and why (a session with no recorded issuer sends nothing and says so). It returns `{ kind: 'from-environment' }` for a session from the environment, which leaves the store alone, or `{ kind: 'not-signed-in' }`, and it throws the problem of an `invalid-override` or `conflict` session.

`verifySession(session)` asks the backend once whether a signed-in session's credential is accepted: `accepted`, `rejected` (HTTP 401 or 403, `UNAUTHENTICATED`, no user, or another user), or `unchecked` when the backend cannot answer. It has the 10 s timeout and classifies by status and code only. Nothing renews a key on its own, because a new key needs a fresh password sign-in: `keyEndsSoon({ expiresAt })` says when a key has ended or ends within 7 days (`SIGN_IN_AGAIN_WITHIN_MS`), so a binary can ask the person to sign in again. None of these throws for a server answer, and the package prints nothing. A message names the server's error codes, never its message text, which may name backend internals.

## Agents

An agent is a principal of the signed-in person, with its own key, for a coding agent or a CI job to act as.

```ts
import { agentSession, createAgent, listAgents, removeAgent, renewAgentKey, resolveSession, sessionToolsHost } from '@agentic-kit/session';

const person = resolveSession({ store });
await createAgent({ store, session: person, password, name: 'helper', allowSchemaChanges: false });
const host = sessionToolsHost({ signInHint: 'Run `constructive agent add helper` to set it up again.', agent: 'helper' });
listAgents({ store }); // [{ name: 'helper', state: 'ready', keyExpiresAt, ... }]
await renewAgentKey({ store, session: person, password, name: 'helper' }); // { agent, previousKey }
await removeAgent({ store, session: person, name: 'helper' });
```

- **What it may do.** `createAgent` creates the principal without the person's admin flag (`useAdminOwner: false`, also on every scope call, whose own default is true). By default its org scope masks `manage_database`, so it cannot change the schema; `allowSchemaChanges`, `grantSchemaChanges` and `revokeSchemaChanges` set or clear that mask. `organization` holds it to one organization. A key for a principal needs a recent password sign-in, so `createAgent` and `renewAgentKey` take the person's `password`, sign in afresh (the stored session names the account and the backend), and end that sign-in on the server when done; a wrong password is a `SignInError`. `grantSchemaChanges`, `revokeSchemaChanges` and `removeAgent` go with the person's stored key.
- **Its key.** `createAgent` caps every key of the principal at 30 days (`apiKeyMaxDuration`), then creates one key for it that asks for 30 days. The key is stored in a 0600 file under the person's context (`<config>/agents/<context>/<name>.json`), bound to the five endpoints it was issued for, like a person's session. `renewAgentKey` gives the same principal a new 30-day key, so it keeps its grants: it stores the new key, drops the cached token, then revokes the old key, which ends every token minted with it (`previousKey` says whether that worked).
- **Its access tokens.** This package uses the key only to mint access tokens for the principal. The backend accepts the key itself on requests too, so whoever holds it can act as the agent until it ends, `renewAgentKey` replaces it, or `removeAgent` deletes the agent; it stays in its 0600 file. `agentSession` gives the cached access token while more than 30 s of it is left, else it mints a new one and caches it in a 0600 file (`<cache>/agents/<context>/<name>.json`), written through a temporary file and a rename. There is no lock: a token may be used many times, so processes that mint at once all work, and the cache keeps one of their tokens. The refresh token the backend makes with each mint is never asked for or stored. With `agent`, `sessionToolsHost`'s `account()` is asynchronous and gives that token; requests never carry the key.
- **A refused token.** After the backend refuses the agent's access token as signed out, pass it back once: `agentSession({ store, name, rejectedToken })` drops it from the cache and mints one token from the key, or uses the token another process already minted. It never retries on its own. If the key is refused too, the answer is `set-up-again`.
- **When it stops.** `agentSession` answers `agent-unusable` with `set-up-again` once the key has ended or the backend refuses it (the fix is to renew the key), or the record cannot be read (the fix is to remove and add the agent), and `mint-failed` (retry) when no token could be minted. The person's `signOut` leaves every agent working until its key ends; `listAgents` says which agents those are, and `removeAgent` deletes the principal, which ends its key and every token minted with it at once.
- **A record edited by hand** that no longer parses makes the agent `set-up-again`; `removeAgent` then removes the entry, and the principal is deleted in the app.
- **Managing agents** needs the person's own stored session; an agent, or a credential from the environment, gets `AgentError` `not-a-person`. A refusal for a recent sign-in is `step-up-required`, and the fix is to sign in again.

## Backends

`backendFromEndpoints({ api, auth?, modules?, agent?, compute? })` builds a backend. A plane that is not given is derived from the api host only when the host is `api.<rest>` (`api.example.com` gives `auth.example.com`). Any other host must give every plane, so a password never goes to a host the caller did not name. It throws an `EndpointError` (`reason`: `not-a-url`, `scheme`, `userinfo` or `not-derivable`) for anything else; only `http` and `https` are accepted, and a user name or password in a URL is refused.

A backend is a named context in the store, named after the api host without a leading `api.` (`https://api.example.com/graphql` is `example.com`). A context name is the stem of a file in the store, so every function that takes one checks it first with `checkContextName`: 1 to 100 characters, lower-case letters, digits, `.`, `-` and `_`, starting with a letter or a digit, with no `..`. Upper case is refused so that two names never reach one file on a disk that ignores letter case (macOS): `PROD` cannot delete the file of `prod`. A bad name throws `ContextNameError` before any file is touched, and `contextNameFor` only produces names that pass. `listBackends` lists a stored context whose name does not pass, for example one with upper-case letters that another program wrote, as `status: 'invalid-name'` with the `reason`, and goes on with the others; no function acts on it, so it is removed by hand (the file under `<base>/.constructive/config/contexts/`). `listBackends`, `readBackend`, `addBackend`, `selectBackend` and `removeBackend` manage the contexts. No function drops a stored session while its key stays valid: `addBackend` keeps the session of a context when it was issued for exactly the new five endpoints, and otherwise throws `ContextInUseError`, as `removeBackend` does while any session is filed under the context. `signOut` first, which revokes the key; `signIn` replaces a session of another backend itself, after it has revoked that session's key.

## Environment

- `CONSTRUCTIVE_STASH_DIR` sets the base directory of the store (`<dir>/.constructive/`) in place of the home directory, for tests and isolated runs. Constructive Desktop reads the same variable. An empty value is an error. `stashDirectories(env)` lists every directory the store uses (root, config, cache, data, logs, tmp) from the same resolution as `openStore`, without creating any, so a caller can refuse a path inside the store.
- `CONSTRUCTIVE_USER_ID` and `CONSTRUCTIVE_ACCESS_TOKEN`, with an optional `CONSTRUCTIVE_API_KEY`, give the credential. Any one of them selects the environment as the credential source, so the set must be complete, and `CONSTRUCTIVE_API_ENDPOINT` must name the backend.
- `CONSTRUCTIVE_API_ENDPOINT` picks the backend. `CONSTRUCTIVE_AUTH_ENDPOINT`, `CONSTRUCTIVE_MODULES_ENDPOINT`, `CONSTRUCTIVE_AGENT_ENDPOINT` and `CONSTRUCTIVE_COMPUTE_ENDPOINT` give one plane each, and are required for an api host that is not `api.<rest>`. A plane variable without `CONSTRUCTIVE_API_ENDPOINT` is an error.

The store file `<base>/.constructive/config/credentials.json` holds the tokens in plaintext with mode `0600`.
