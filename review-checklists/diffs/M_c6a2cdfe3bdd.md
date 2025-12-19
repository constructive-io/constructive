# Diff — `M` `functions/simple-email/src/index.ts`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Numstat: `+2/-2`
- Reproduce: `git diff main...HEAD -- functions/simple-email/src/index.ts`

## Guideline token summary
- Deltas: `@launchql/`: 3 → 1; `launchql`: 3 → 1; `@constructive-io/`: 1 → 2; `constructive`: 1 → 2
- Remaining legacy tokens in `HEAD`: `launchql`(1), `@launchql/`(1)

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

```text
      // Send via @launchql/postmaster (Mailgun or configured provider)						      |	      // Send via the Postmaster package (Mailgun or configured provider)
  // @launchql/knative-job-fn exposes a .listen method that delegates to the underlying Express app		      |	  // @constructive-io/knative-job-fn exposes a .listen method that delegates to the underlying Express app
```
