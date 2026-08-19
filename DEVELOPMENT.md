Requires Node.js >= 22 (`nvm use` picks it up from `.nvmrc`); CI runs Node 22.

Older Node does **not** fail fast. `grafast` and `@dataplan/pg` use
`Promise.withResolvers()`, unavailable before Node 22, in their query execution
paths — so every list/connection query (`{ things { nodes { ... } } }`) fails at
runtime with:

```
TypeError: Cannot read properties of undefined (reading 'items')
    at grafast/src/steps/connection.ts (ConnectionStep.execute)
```

while mutations and single-record lookups keep working, which makes it look like
a grafast `ConnectionStep` bug. Check `node --version` first.

First initialize the database for testing:

```sh
docker-compose up -d
```

Install dependencies and build:

```sh
pnpm install
pnpm build
```

Seed the `app_user` roles used by tests:

```sh
pnpm --filter pgpm exec node dist/index.js admin-users bootstrap --client --yes
pnpm --filter pgpm exec node dist/index.js admin-users add --test --yes
```

Then you can "install" the packages need (optional):

```sh
docker exec postgres /sql-bin/install.sh
```

Then to run a test:

```sh
cd pgpm/core
pnpm test
```
