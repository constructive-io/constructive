# Diff — `M` `packages/cli/__tests__/codegen.test.ts`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Numstat: `+15/-15`
- Reproduce: `git diff main...HEAD -- packages/cli/__tests__/codegen.test.ts`

## Guideline token summary
- Deltas: `launchql`: 12 → 0; `constructive`: 0 → 8; `@constructive-io/`: 0 → 7; `@launchql/`: 7 → 0; `LaunchQL`: 4 → 0; `GraphQLCodegenOptions`: 0 → 3; `LaunchQLGenOptions`: 3 → 0; `mergeGraphQLCodegenOptions`: 0 → 2; `mergeLaunchQLGenOptions`: 2 → 0; `Constructive`: 0 → 1

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

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
