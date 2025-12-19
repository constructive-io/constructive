# Diff — `M` `TODO.md`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Numstat: `+6/-6`
- Reproduce: `git diff main...HEAD -- TODO.md`

## Guideline token summary
- Deltas: `constructive`: 2 → 4; `launchql`: 2 → 0; `@constructive-io/`: 0 → 1; `@launchql/`: 1 → 0; `LaunchQL`: 1 → 0; `lql`: 1 → 0

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

```text
packages/pgsql-test/src/seed/sqitch.ts										      |	postgres/pgsql-test/src/seed/sqitch.ts
- [ ] Add tests for @launchql/react										      |	- [ ] Add tests for @constructive-io/graphql-react
- [ ] Get this PR from launchql-gen: https://github.com/constructive-io/constructive-gen/pull/19		      |	- [ ] Get this PR for GraphQL codegen: https://github.com/constructive-io/constructive-gen/pull/19
- [x] Import original LaunchQL history (preserve git log)							      |	- [x] Import original legacy history (preserve git log)
- [x] Get boilerplate (`lql init`) working									      |	- [x] Get boilerplate (`constructive init`) working
      - Context: stage fixture (unique-names) pre-generated plan with includePackages=false and includeTags=false cur |	      - Context: stage fixture (unique-names) pre-generated plan with includePackages=false and includeTags=false cur
```
