# Local Development Workflow

Steps to mimic the published npm package locally in `@apps/test-sdk`.

## 1. Build and pack the SDK

Creates a `.tgz` like `constructive-io-graphql-sdk-0.1.0.tgz`.

```sh
pnpm --filter @constructive-io/graphql-sdk build
mkdir -p apps/test-sdk/vendor
pnpm -C packages/graphql-sdk pack --pack-destination ../../apps/test-sdk/vendor
```

## 2. Install the tarball into the test app

This updates `package.json` away from `workspace:*`.

**Option A:** Run from inside the test-sdk directory (glob works):

```sh
cd apps/test-sdk
pnpm add -D ./vendor/*.tgz
```

**Option B:** Run from monorepo root (must specify exact filename):

```sh
pnpm --filter @constructive-io/test-sdk add -D ./apps/test-sdk/vendor/constructive-io-graphql-sdk-0.1.0.tgz
```

> Note: `--filter` executes from the monorepo root, so paths must be relative to root, not the filtered package. Glob patterns also don't expand when using `--filter`.

## 3. Initialize a config file (TypeScript)

```sh
cd apps/test-sdk
npx graphql-sdk init -e http://api.localhost:3000/graphql
```

This creates `graphql-sdk.config.ts`. The CLI uses `jiti` internally to load `.ts` configs, so no extra tooling is required.

## 4. Sanity check and run codegen

Ensure `http://api.localhost:3000/graphql` is running/reachable.

```sh
cd apps/test-sdk
npx graphql-sdk --help
npx graphql-sdk generate --dry-run
npx graphql-sdk generate
```

You can also use the test app script:

```sh
pnpm --filter @constructive-io/test-sdk codegen
```

## Using `npx`

Once installed, the CLI is available via `npx` in the test-sdk directory:

```sh
cd apps/test-sdk

# Both work - the bin name is "graphql-sdk"
npx graphql-sdk --help
npx @constructive-io/graphql-sdk --help
```

The `bin.graphql-sdk` field in package.json creates a binary named `graphql-sdk`, so you can use either the bin name directly or the full scoped package name.

## Troubleshooting

**Unknown file extension ".ts"**

If you see:

```
Failed to load config file: Unknown file extension ".ts"
```

you likely have a stale install of the tarball cached by pnpm. Reinstall the package or clear the cache for the SDK:

```sh
cd apps/test-sdk
rm -rf node_modules
rm -rf ../../node_modules/.pnpm/@constructive-io+graphql-sdk*
pnpm install
```

If you re-pack frequently with the same version, bumping the package version also avoids cache reuse.

## Resetting to workspace dependency

To switch back to local development with `workspace:*`:

```sh
cd apps/test-sdk
pnpm add -D "@constructive-io/graphql-sdk@workspace:*"
rm -rf vendor
```
