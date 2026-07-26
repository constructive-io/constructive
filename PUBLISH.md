## publishing

```
pnpm install
pnpm build
pnpm lerna publish
```

The build step is not optional. Workspace deps resolve to a sibling `dist/`
(`link:../env/dist` in the lockfile), and each package's `prepack` runs
`makage build`, which deletes `dist/` before recompiling. Building everything
up front, in topological order, means no package's `tsc` runs against a
dependency whose `dist/` is missing or half-written.

### recovering a half-finished release

`lerna version` bumps versions, writes CHANGELOGs and commits/tags before
anything is packed, so a `prepack` failure leaves the repo versioned but
nothing on npm. Do not re-run `lerna version` — publish the already-bumped
versions:

```
pnpm install
pnpm build
pnpm lerna publish from-package
```

### `Cannot find module 'express'` (or any other plain dependency) in prepack

The failing package has no `node_modules/` of its own — usually a newly added
workspace package in a checkout that was installed before it existed. `makage`
still runs (it is hoisted to the repo root), so the build starts and then fails
to resolve every single import, workspace and third-party alike.

```
rm -rf <path/to/package>/node_modules
pnpm install
```
