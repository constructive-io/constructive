# Diff — `M` `functions/send-email-link/README.md`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Numstat: `+8/-9`
- Reproduce: `git diff main...HEAD -- functions/send-email-link/README.md`

## Guideline token summary
- Deltas: `@constructive-io/`: 0 → 8; `@launchql/`: 14 → 6; `constructive`: 0 → 8; `launchql`: 14 → 6; `Constructive`: 0 → 1; `LaunchQL`: 1 → 0
- Remaining legacy tokens in `HEAD`: `launchql`(6), `@launchql/`(6)

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

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
