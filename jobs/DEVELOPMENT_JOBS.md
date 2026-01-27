# Jobs Development Setup

This guide covers a local development workflow for the jobs stack:

- Postgres + `pgpm-database-jobs`
- Constructive Admin GraphQL API server (header-based routing)
- `send-email-link` function
- `knative-job-service`

It assumes:

- You have Docker / Docker Compose v2 installed.
- You are using `pgpm` for database initialization.
- You have the latest `pgpm` installed (`npm i -g pgpm` or equivalent).

---

## 1. Start Postgres (and Minio)

From the `constructive/` directory:

```sh
docker compose up -d postgres
```

This uses `docker-compose.yml` and creates a Docker network called `constructive-net` that other services will join.

---

## 2. Configure your local Postgres env (pgenv)

Add this helper to your shell config (for example in `~/.zshrc`):

```sh
pgenv() {
  export PGHOST=localhost
  export PGPORT=5432
  export PGUSER=postgres
  export PGPASSWORD=password
  export PGDATABASE=constructive
  echo "PostgreSQL environment variables set"
}
```

Then in a new shell (or after re-sourcing `~/.zshrc`), run:

```sh
pgenv
```

This ensures all subsequent `pgpm` and `psql` commands point at the same local database.

---

## 3. Bootstrap roles and database with pgpm

Make sure `pgpm` is installed and up to date.

From the `constructive-db/` directory (with `pgenv` applied):

1. Create the `constructive` database (if it does not already exist):

   ```sh
   createdb constructive
   ```

2. Bootstrap admin users:

   ```sh
   pgpm admin-users bootstrap --yes
   pgpm admin-users add --test --yes ## NOTE: not to be run in production
   ```

3. Deploy the main app and jobs packages into DB:

   ```sh
   pgpm deploy --yes --database "$PGDATABASE" --package constructive-local
   pgpm deploy --yes --database "$PGDATABASE" --package pgpm-database-jobs
   ```

At this point, the app schema and `database-jobs` should be installed and `app_jobs.*` should be available in the `constructive` database.

---

## 4. Start jobs stack (API + worker + function)

With Postgres initialized, bring up the jobs-related services using `docker-compose.jobs.yml`:

```sh
docker compose -f docker-compose.jobs.yml build
docker compose -f docker-compose.jobs.yml up
```

Or run detached:

```sh
docker compose -f docker-compose.jobs.yml up --build
```

This starts:

- `constructive-admin-server` – GraphQL API server with `API_IS_PUBLIC=false` (port 3001)
- `send-email-link` – Knative-style HTTP function (port 8082)
- `knative-job-service` – jobs runtime (callback server + worker + scheduler) (port 8080)

---

### Switching dry run vs real Mailgun sending

By default, `docker-compose.jobs.yml` runs `send-email-link` in dry-run mode (no real email is sent), and it uses placeholder Mailgun credentials.

Dry run (recommended for local development):

```sh
docker compose -f docker-compose.jobs.yml up -d --build --force-recreate
```

In dry-run mode:

- The `send-email-link` container logs the payload it would send instead of hitting Mailgun.
- You should see log lines like `[send-email-link] DRY RUN email (skipping send) ...`.
---

## 5. Ensure GraphQL host routing works for `send-email-link`

The `send-email-link` function uses host-based routing via the `Host: private.localhost` header to access the private API.

For local development, `docker-compose.jobs.yml` configures `send-email-link` with:

- `GRAPHQL_URL=http://constructive-admin-server:3000/graphql`
- `GRAPHQL_HOST_HEADER=private.localhost`

Quick check from your host (should return JSON with schema info):

```sh
# Test private API access via host header routing
curl -s -H 'Host: private.localhost' \
  -H 'Content-Type: application/json' \
  -X POST http://localhost:3001/graphql \
  --data '{"query":"{ __schema { queryType { fields { name } } } }"}'

# List databases
curl -s -H 'Host: private.localhost' \
  -H 'Content-Type: application/json' \
  -X POST http://localhost:3001/graphql \
  --data '{"query":"{ databases { nodes { id name } } }"}'

# List users
curl -s -H 'Host: private.localhost' \
  -H 'Content-Type: application/json' \
  -X POST http://localhost:3001/graphql \
  --data '{"query":"{ users { nodes { id username displayName } } }"}'
```

You can also access GraphiQL at: http://private.localhost:3001/graphiql

If your GraphQL server requires auth, set `GRAPHQL_AUTH_TOKEN` before starting the jobs stack (it is passed through to the `send-email-link` container).

---

## 6. Enqueue a test job (`send-email-link`)

`send-email-link` queries GraphQL for site/database metadata, so it requires:

- The app/meta packages deployed in step 3 (`app-svc-local`, `metaschema-schema`, `services`, `metaschema-modules`)
- A real `database_id`
- A GraphQL hostname that matches a seeded domain route (step 5)
- For localhost development, the site/domain metadata usually resolves to `localhost`.
  In that case, the function will honor the `LOCAL_APP_PORT` env (default `3000` in
  `docker-compose.jobs.yml`) and generate links like `http://localhost:3000/...`
  when `SEND_EMAIL_LINK_DRY_RUN=true`.

### Get required IDs

```sh
# Get Database ID
DBID="$(docker exec -i postgres psql -U postgres -d constructive -Atc \
  'SELECT id FROM metaschema_public.database ORDER BY created_at LIMIT 1;')"
echo "Database ID: $DBID"

# Get User ID (for sender_id in invite emails)
SENDER_ID="$(docker exec -i postgres psql -U postgres -d constructive -Atc \
  'SELECT id FROM constructive_users_public.users ORDER BY created_at LIMIT 1;')"
echo "Sender ID: $SENDER_ID"
```

### Enqueue invite_email job

```sh
docker exec -it postgres \
  psql -U postgres -d constructive -c "
    SELECT app_jobs.add_job(
      '$DBID'::uuid,
      'send-email-link',
      json_build_object(
        'email_type',   'invite_email',
        'email',        'user@example.com',
        'invite_token', 'invite-token-123',
        'sender_id',    '$SENDER_ID'
      )::json
    );
  "
```

### Enqueue forgot_password job

```sh
docker exec -it postgres \
  psql -U postgres -d constructive -c "
    SELECT app_jobs.add_job(
      '$DBID'::uuid,
      'send-email-link',
      json_build_object(
        'email_type',   'forgot_password',
        'email',        'user@example.com',
        'user_id',      '$SENDER_ID',
        'reset_token',  'reset-token-123'
      )::json
    );
  "
```

### Enqueue email_verification job

```sh
docker exec -it postgres \
  psql -U postgres -d constructive -c "
    SELECT app_jobs.add_job(
      '$DBID'::uuid,
      'send-email-link',
      json_build_object(
        'email_type',   'email_verification',
        'email',        'user@example.com',
        'email_id',     '$(uuidgen)',
        'verification_token', 'verify-token-123'
      )::json
    );
  "
```

### Watch the logs

```sh
# Watch send-email-link function logs
docker logs -f send-email-link

# Watch job service logs
docker logs -f knative-job-service
```

You should see a log like:

- `[send-email-link] DRY RUN email (skipping send) ...`

---

## 7. Inspect logs and iterate

To watch logs while you develop:

```sh
docker compose -f docker-compose.jobs.yml logs -f
```

Useful containers:

- `constructive-admin-server`
- `send-email-link`
- `knative-job-service`
- `postgres` (from `docker-compose.yml`)

If you change Docker images, environment variables, or code inside the image, restart the stack:

```sh
docker compose -f docker-compose.jobs.yml down
docker compose -f docker-compose.jobs.yml up --build
```

---

## 8. Stopping services

To stop only the jobs stack:

```sh
docker compose -f docker-compose.jobs.yml down
```

To stop everything, including Postgres and Minio:

```sh
docker compose down
```

---

## 9. Optional Mailgun secrets for real sending

Real Mailgun credentials are **not required** to run the jobs stack locally; they are only needed if you want to send real email in development instead of using dry-run logging.

To start the stack with real sending from the command line:

```sh
MAILGUN_API_KEY="your-mailgun-key" MAILGUN_KEY="your-mailgun-key" SEND_EMAIL_LINK_DRY_RUN=false docker compose -f docker-compose.jobs.yml up -d --build --force-recreate
```

Alternatively, you can set the secrets in your shell or a local `.env` file (do not commit this file) in the `constructive/` directory:

```sh
export MAILGUN_API_KEY="your-mailgun-key"
export MAILGUN_KEY="your-mailgun-key"
```

If you're not using `mg.constructive.io`, also override `MAILGUN_DOMAIN`, `MAILGUN_FROM`, and `MAILGUN_REPLY` (for example in an override file) to match your Mailgun setup.

To have the container send real email instead of dry-run, set:

```sh
export SEND_EMAIL_LINK_DRY_RUN=false
```

Then recreate the stack so the new env is applied:

```sh
docker compose -f docker-compose.jobs.yml up -d --build --force-recreate
```

If you prefer not to export env vars, create a local override file (don't commit it) at `docker-compose.jobs.override.yml`:

```yml
services:
  send-email-link:
    environment:
      SEND_EMAIL_LINK_DRY_RUN: "false"
```

Start the stack with both files:

```sh
docker compose -f docker-compose.jobs.yml -f docker-compose.jobs.override.yml up -d --build --force-recreate
```

To switch back to dry-run, set `SEND_EMAIL_LINK_DRY_RUN=true` (or delete the override file) and recreate again.


## NOTES:
- change all launchql names to constructive, including the DB-name and more.
- run bootstrap command for test user, 
- need to run some manual migrations like:
```sql
 BEGIN;
   UPDATE services_public.domains SET domain = 'localhost';
   UPDATE services_public.apis SET dbname = 'constructive';
 COMMIT;

------ Some more
ALTER TABLE metaschema_public.database
ADD CONSTRAINT database_owner_id_fkey
FOREIGN KEY (owner_id)
REFERENCES constructive_public.users(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;
```

> NOTE: please make similar changes to the devnet as well please

