# Diff — `M` `DEVELOPMENT.md`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Numstat: `+9/-9`
- Reproduce: `git diff main...HEAD -- DEVELOPMENT.md`

## Guideline token summary
- Deltas: `lql`: 2 → 0

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

```text
Make sure you have the psql client, and then run this:								      |	Install dependencies and build:
lql admin-users bootstrap --yes											      |	pnpm install
lql admin-users add --test --yes										      |	pnpm build
Then you can "install" the packages need (optional):								      |	Seed the `app_user` roles used by tests:
docker exec postgres /sql-bin/install.sh									      |	pnpm --filter pgpm exec node dist/index.js admin-users bootstrap --yes
														      >	pnpm --filter pgpm exec node dist/index.js admin-users add --test --yes
Then you can run												      |	Then you can "install" the packages need (optional):
pnpm install													      |	docker exec postgres /sql-bin/install.sh
pnpm build													      <	
cd packages/core												      |	cd pgpm/core
```
