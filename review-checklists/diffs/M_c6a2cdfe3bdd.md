# Diff — `M` `functions/simple-email/src/index.ts`

## Navigation
- Prev: [M_ca4fe180573c.md](M_ca4fe180573c.md) | Up: [functions.md](../functions.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_6660ff80b5d6.md](M_6660ff80b5d6.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `functions`
- Numstat: `+2/-2`
- Reproduce: `git diff main...HEAD -- functions/simple-email/src/index.ts`

## Changes (line-aligned)
- `      // Send via the Postmaster package (Mailgun or configured provider)`
  - `@launchql/postmaster` → `the Postmaster package`
- `  // @constructive-io/knative-job-fn exposes a .listen method that delegates to the underlying Express app`
  - `launchql` → `constructive-io`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
      // Send via @launchql/postmaster (Mailgun or configured provider)						      |	      // Send via the Postmaster package (Mailgun or configured provider)
  // @launchql/knative-job-fn exposes a .listen method that delegates to the underlying Express app		      |	  // @constructive-io/knative-job-fn exposes a .listen method that delegates to the underlying Express app
```

</details>

## Navigation
- Prev: [M_ca4fe180573c.md](M_ca4fe180573c.md) | Up: [functions.md](../functions.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_6660ff80b5d6.md](M_6660ff80b5d6.md)
