<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

# @agentic-kit/run-log

The append-only **run log**: one ordered record of what an agent run did, wherever it ran.

A coding agent run has to be observable from a desktop app, a web UI and a CLI; it has to be resumable after a crash, a restart, or a move from the cloud to a laptop; and it has to be meterable. Those are usually four subsystems. Here they are four *projections* of one log:

```
pi session entries ──► run log (append-only) ──┬──► transcript parts   (what a UI draws)
                                               ├──► usage totals       (what a run cost)
                                               ├──► tool + approval    (what is blocked)
                                               └──► pi session file    (how it resumes)
```

The log stores **pi entries verbatim** under four platform-owned fields. pi already versions and migrates its own session format, so re-encoding it into a second semantic event model would mean maintaining a translation layer that silently loses whatever pi adds next.

```ts
{
  runId,             // which run
  seq,               // 1-based, gapless, strictly increasing
  recordedAt,        // when the platform durably recorded it
  piSessionVersion,  // pi's session format version at write time
  entry              // the pi entry, byte-for-byte
}
```

## Install

```sh
npm install @agentic-kit/run-log
```

## Writing

Writing is an `append` against a store. Appends are **idempotent by pi entry id**, so a writer that restarts and replays its tail does not duplicate history.

```ts
import { MemoryRunLogStore } from '@agentic-kit/run-log';

const store = new MemoryRunLogStore();
await store.append('run-1', [entry]);        // → the records actually written
await store.append('run-1', [entry]);        // → [] — already present
```

Two stores ship here: `MemoryRunLogStore` (the reference implementation, and the test double) and `FileRunLogStore` from the node-only entry point:

```ts
import { FileRunLogStore, writeSessionFile } from '@agentic-kit/run-log/file-store';
```

The main entry is **browser-safe** — renderers import the projectors, so nothing in it may reach for a node builtin. Anything touching the filesystem lives behind `/file-store` (the same split, for the same reason, as `12factor-env/dotenv`).

The durable store is Postgres, in `constructive-db`: `append` becomes an insert, `read` a keyset scan. Neither is in this package, because the interface is the contract.

## Reading

Every surface is the same reader: hold a cursor, ask for what came after it. That is what makes a local run and a cloud run indistinguishable to a UI.

```ts
import { follow, projectParts, readAll } from '@agentic-kit/run-log';

const records = await readAll(store, 'run-1');

for await (const batch of follow(store, 'run-1', { waitForChange })) {
  render(projectParts(batch).parts);
}
```

`waitForChange` (Postgres `LISTEN/NOTIFY`, IPC, a websocket) is an *optimisation*: it races the poll delay, and without one `follow` degrades to polling. No new transport is required for a run to stream.

## Projections

| Projection | Answers |
| --- | --- |
| `projectParts` | the renderable transcript — a tool call and its later result collapse into one part, so no renderer correlates messages itself |
| `projectUsage` | tokens and cost, per `provider/model` and per run, including nested tool usage and compaction calls |
| `projectToolState` | what is running, what is waiting on a human, and how the gate settled each call (approvals and gate decisions ride in the log as pi `custom` messages, so a surface that reconnects hours later still sees a pending request) |
| `projectSpans` | how long each step took, and inside what — tool spans (call → result), model spans, approval spans (request → answer) with parents, for a timeline |
| `projectSession` | a pi session file — the resume path, cloud → local included |

All of them are pure and total: the same records always produce the same output, whichever host wrote them, which is the property the tests assert as *placement invariance*.

A span duration derived from a *pair of writes* is a bound, not a measurement — the gap between a tool call and its result includes the wait for a human — so every span says which it is (`timing: 'bounded' | 'measured'`) and a tool span carries its approval wait separately. An interval that never closed stays `open` with no duration, because a run still in flight must not look like one that finished.

## Entry types

New event kinds are namespaced pi `custom` messages, not new tables: the log stores entries verbatim, so a type is only a `customType` string plus a validator. `constructiveEntryTypes()` is the registry of the ones this platform writes — approval requests and answers, and `constructive.gate.decision` — each pairing a details type with a runtime assertion, a label, and a visibility:

| Visibility | Meaning |
| --- | --- |
| `surface` | part of the conversation the model sees — an approval question and its answer |
| `log-only` | audit and trace data, never fed back to the model — a gate decision, which the model already learned of through the blocked call's error |

An unregistered type is `log-only`: a trace view showing an unknown row is right, a prompt built from one is not.

Unreadable input fails loudly. A corrupt record, a mixed-version log, or a session whose header is not first throws rather than degrading into an empty transcript — a run that silently renders as blank is worse than one that reports it cannot be read. An *unknown* entry type is different: it is carried through as an `unknown` part, so a log written by a newer pi still renders.

## Related

- [`@agentic-kit/pi`](../pi) — Constructive's typed db tools as a pi extension
- [`@agentic-kit/harness`](../harness) — host-neutral gates and policy
- [`agentic-server`](../agentic-server) — the metered inference gateway

## License

SEE LICENSE IN LICENSE
