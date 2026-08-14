<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

# @agentic-kit/pi-ext-run-log

The write side of the [`@agentic-kit/run-log`](../run-log) for a pi coding-agent session: a pi extension that mirrors every session entry into a run-log store, verbatim and in order.

The same extension runs in both placements — a local session in Constructive Desktop and a cloud session in a long-running job. Only `runId` and the store differ, which is what makes a run observable from anywhere without a second transcript format.

## Usage

```ts
import { createRunLogExtension } from '@agentic-kit/pi-ext-run-log';

const { extension, flush } = createRunLogExtension({
  runId,
  store // any RunLogAppendStore: memory, JSONL, or the API/Postgres-backed one
});

const session = await AgentSession.create({ extensions: [extension] });
// …
await flush(); // before the host exits
```

## How it mirrors

pi owns the session — an append-only tree of entries, persisted as JSONL — and exposes no "entry appended" event. So the extension *drains*: after each event that could have appended, it takes the entries it has not seen yet and appends them.

- Index-based draining is sound because the session is append-only: entries are never rewritten or removed, only branched from.
- The session header is mirrored once, as the first record of that session.
- Drains are serialized, so concurrent events cannot interleave batches and break run-log ordering.
- A drain advances its read position only after a successful append, so a failed append is retried whole rather than leaving a hole.
- Read position is keyed to the session header id: a switch/fork/new-session re-mirrors from the start, and entries carried over are absorbed by the store's idempotency (pi entry ids). The same property makes resume free — a restarted host re-appends its history and writes nothing new.

`MIRROR_EVENTS` is the default event list; narrow it with `events` if a host wants fewer drains.

## Failure behavior

A store failure is **rethrown into pi's event dispatch** by default. A run log that silently stops recording is worse than a loud one, so losing entries is never the default. Pass `onError` if the host would rather log and continue.

## Testing

`SessionMirror` is the whole mechanism and knows nothing about pi's extension API, so mirroring is tested against a fake session; the extension test drives the registered handlers with a fake `ExtensionAPI`.

```sh
pnpm test
```
