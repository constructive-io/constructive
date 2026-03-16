# test-codegen-app

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/test-codegen-app"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphql%2Ftest-app%2Fpackage.json"/></a>
</p>

Local integration app for validating `@constructive-io/graphql-codegen` output against a real GraphQL endpoint.

This package is intended for:
- Generating React Query + ORM output from the current workspace codegen implementation.
- Type-checking real generated artifacts.
- Running live integration checks with real auth credentials.

This package is not part of CI test gating and is meant for local/manual verification.

## What It Tests

- React Query output mode generation and usage.
- ORM output mode generation and usage.
- Generated type fidelity in real app code (`tsc --noEmit`).
- Live endpoint behavior in `tests/*.test.ts`.

## Local Usage

Run from repo root.

1. Generate from `codegen.config.ts`:

```bash
pnpm --filter @constructive-io/test-codegen-app codegen
```

2. Type-check generated output:

```bash
pnpm --filter @constructive-io/test-codegen-app typecheck
```

3. Build the app:

```bash
pnpm --filter @constructive-io/test-codegen-app build
```

4. Run integration tests (non-live mode, skips credentialed tests):

```bash
pnpm --filter @constructive-io/test-codegen-app test:integration
```

5. Run live integration tests:

```bash
GRAPHQL_TEST_EMAIL="you@example.com" \
GRAPHQL_TEST_PASSWORD="your-password" \
pnpm --filter @constructive-io/test-codegen-app test:integration:live
```

Optional:
- `GRAPHQL_TEST_ENDPOINT` to override the default endpoint used by live tests.

## Notes

- `codegen` uses `graphql/test-app/codegen.config.ts` (currently pointed at the production endpoint for validation).
- `codegen:orm` is available for direct endpoint-driven ORM generation checks.
- Keep this app focused on realistic generated-API usage and regression coverage for codegen refactors.
