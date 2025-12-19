# Diff — `M` `packages/cli/__tests__/codegen.test.ts`

## Navigation
- Prev: [M_61580404e6fb.md](M_61580404e6fb.md) | Up: [packages/cli.md](../packages/cli.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_b0cbf04212b2.md](M_b0cbf04212b2.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `packages/cli`
- Numstat: `+15/-15`
- Reproduce: `git diff main...HEAD -- packages/cli/__tests__/codegen.test.ts`

## Changes (line-aligned)
- `jest.mock('@constructive-io/graphql-codegen', () => {`
  - `launchql` → `constructive-io`
  - `` → `graphql-`
- `    defaultGraphQLCodegenOptions: { input: {}, output: { root: 'graphql/codegen/dist' }, documents: {}, features: { emitTypes: true, emitOperations: true, emitSdk: true } },`
  - `defaultLaunchQLGenOptions` → `defaultGraphQLCodegenOptions`
  - `packages` → `graphql`
  - `launchql-gen` → `codegen`
- `    mergeGraphQLCodegenOptions: deepMerge`
  - `mergeLaunchQLGenOptions` → `mergeGraphQLCodegenOptions`
- `jest.mock('@constructive-io/graphql-server', () => ({`
  - `launchql` → `constructive-io`
  - `` → `graphql-`
- `    expect(first).toContain('Constructive GraphQL Codegen')`
  - `LaunchQL` → `Constructive GraphQL`
- `    const { fetchEndpointSchemaSDL } = require('@constructive-io/graphql-server')`
  - `launchql` → `constructive-io`
  - `` → `graphql-`
- `    const { runCodegen } = require('@constructive-io/graphql-codegen')`
  - `launchql` → `constructive-io`
  - `` → `graphql-`
- `      out: 'graphql/codegen/dist'`
  - `packages` → `graphql`
  - `launchql-gen` → `codegen`
- `    expect(fs.writeFile).toHaveBeenCalledWith(path.join(cwd, '.constructive-codegen-schema.graphql'), expect.any(String), 'utf8')`
  - `lql` → `constructive`
- `    const { fetchEndpointSchemaSDL } = require('@constructive-io/graphql-server')`
  - `launchql` → `constructive-io`
  - `` → `graphql-`
- `    const { runCodegen } = require('@constructive-io/graphql-codegen')`
  - `launchql` → `constructive-io`
  - `` → `graphql-`
- `      out: 'graphql/codegen/dist'`
  - `packages` → `graphql`
  - `launchql-gen` → `codegen`
- `    const { runCodegen, mergeGraphQLCodegenOptions } = require('@constructive-io/graphql-codegen')`
  - `mergeLaunchQLGenOptions` → `mergeGraphQLCodegenOptions`
  - `launchql` → `constructive-io`
  - `` → `graphql-`
- `      out: 'graphql/codegen/dist',`
  - `packages` → `graphql`
  - `launchql-gen` → `codegen`
- `    expect(options.output.root).toBe('graphql/codegen/dist')`
  - `packages` → `graphql`
  - `launchql-gen` → `codegen`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
jest.mock('@launchql/codegen', () => {										      |	jest.mock('@constructive-io/graphql-codegen', () => {
    defaultLaunchQLGenOptions: { input: {}, output: { root: 'packages/launchql-gen/dist' }, documents: {}, features:  |	    defaultGraphQLCodegenOptions: { input: {}, output: { root: 'graphql/codegen/dist' }, documents: {}, features: { e
    mergeLaunchQLGenOptions: deepMerge										      |	    mergeGraphQLCodegenOptions: deepMerge
jest.mock('@launchql/server', () => ({										      |	jest.mock('@constructive-io/graphql-server', () => ({
    expect(first).toContain('LaunchQL Codegen')									      |	    expect(first).toContain('Constructive GraphQL Codegen')
    const { fetchEndpointSchemaSDL } = require('@launchql/server')						      |	    const { fetchEndpointSchemaSDL } = require('@constructive-io/graphql-server')
    const { runCodegen } = require('@launchql/codegen')								      |	    const { runCodegen } = require('@constructive-io/graphql-codegen')
      out: 'packages/launchql-gen/dist'										      |	      out: 'graphql/codegen/dist'
    expect(fs.writeFile).toHaveBeenCalledWith(path.join(cwd, '.lql-codegen-schema.graphql'), expect.any(String), 'utf |	    expect(fs.writeFile).toHaveBeenCalledWith(path.join(cwd, '.constructive-codegen-schema.graphql'), expect.any(Stri
    const { fetchEndpointSchemaSDL } = require('@launchql/server')						      |	    const { fetchEndpointSchemaSDL } = require('@constructive-io/graphql-server')
    const { runCodegen } = require('@launchql/codegen')								      |	    const { runCodegen } = require('@constructive-io/graphql-codegen')
      out: 'packages/launchql-gen/dist'										      |	      out: 'graphql/codegen/dist'
    const { runCodegen, mergeLaunchQLGenOptions } = require('@launchql/codegen')				      |	    const { runCodegen, mergeGraphQLCodegenOptions } = require('@constructive-io/graphql-codegen')
      out: 'packages/launchql-gen/dist',									      |	      out: 'graphql/codegen/dist',
    expect(options.output.root).toBe('packages/launchql-gen/dist')						      |	    expect(options.output.root).toBe('graphql/codegen/dist')
```

</details>

## Navigation
- Prev: [M_61580404e6fb.md](M_61580404e6fb.md) | Up: [packages/cli.md](../packages/cli.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_b0cbf04212b2.md](M_b0cbf04212b2.md)
