# Diff — `M` `functions/send-email-link/README.md`

## Navigation
- Prev: [M_f09bdedec6b8.md](M_f09bdedec6b8.md) | Up: [functions.md](../functions.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_2f0b9e503944.md](M_2f0b9e503944.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `functions`
- Numstat: `+8/-9`
- Reproduce: `git diff main...HEAD -- functions/send-email-link/README.md`

## Changes (line-aligned)
- `# @constructive-io/send-email-link-fn`
  - `launchql` → `constructive-io`
- ``Knative-compatible email link function used with the Constructive jobs system. It is designed to be invoked by `@constructive-io/knative-job-worker` as an HTTP function named `send-email-link`.``
  - `LaunchQL` → `Constructive`
  - `launchql` → `constructive-io`
- ``The function is wrapped by `@constructive-io/knative-job-fn`, so it expects:``
  - `launchql` → `constructive-io`
- ``- Headers (set by `@constructive-io/knative-job-worker`):``
  - `launchql` → `constructive-io`
- ``Errors are propagated through the Express error middleware installed by `@constructive-io/knative-job-fn`, so they can be translated into `X-Job-Error` callbacks by your gateway/callback server.``
  - `launchql` → `constructive-io`
- `pnpm --filter="@constructive-io/send-email-link-fn" build`
  - `launchql` → `constructive-io`
- `pnpm --filter="@constructive-io/send-email-link-fn" build`
  - `launchql` → `constructive-io`
- ``Once deployed, point `@constructive-io/knative-job-worker` at this service by configuring:``
  - `launchql` → `constructive-io`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
# @launchql/send-email-link-fn											      |	# @constructive-io/send-email-link-fn
Knative-compatible email link function used with the LaunchQL jobs system. It is designed to be invoked by `@launchql |	Knative-compatible email link function used with the Constructive jobs system. It is designed to be invoked by `@cons
The function is wrapped by `@launchql/knative-job-fn`, so it expects:						      |	The function is wrapped by `@constructive-io/knative-job-fn`, so it expects:
- Headers (set by `@launchql/knative-job-worker`):								      |	- Headers (set by `@constructive-io/knative-job-worker`):
Errors are propagated through the Express error middleware installed by `@launchql/knative-job-fn`, so they can be tr |	Errors are propagated through the Express error middleware installed by `@constructive-io/knative-job-fn`, so they ca
pnpm --filter="@launchql/send-email-link-fn" build								      |	pnpm --filter="@constructive-io/send-email-link-fn" build
pnpm --filter="@launchql/send-email-link-fn" build								      |	pnpm --filter="@constructive-io/send-email-link-fn" build
Once deployed, point `@launchql/knative-job-worker` at this service by configuring:				      |	Once deployed, point `@constructive-io/knative-job-worker` at this service by configuring:
```

</details>

## Navigation
- Prev: [M_f09bdedec6b8.md](M_f09bdedec6b8.md) | Up: [functions.md](../functions.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_2f0b9e503944.md](M_2f0b9e503944.md)
