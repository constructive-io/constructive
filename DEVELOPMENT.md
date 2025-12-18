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
pnpm --filter pgpm exec node dist/index.js admin-users bootstrap --yes
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
