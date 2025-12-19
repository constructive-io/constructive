# Diff — `M` `docker/README.md`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Numstat: `+2/-3`
- Reproduce: `git diff main...HEAD -- docker/README.md`

## Guideline token summary
- Deltas: `constructive`: 4 → 6; `launchql`: 2 → 0; `Constructive`: 3 → 4; `LaunchQL`: 1 → 0

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

```text
- **GitHub Action**: `.github/workflows/docker-launchql.yaml`							      |	- **GitHub Action**: `.github/workflows/docker-constructive.yaml`
- **docker-launchql.yaml** - Builds the main LaunchQL image from the root Dockerfile				      |	- **docker-constructive.yaml** - Builds the main Constructive image from the root Dockerfile
```
