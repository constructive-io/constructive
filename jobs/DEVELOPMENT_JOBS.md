# Jobs Development Setup

This guide covers a local development workflow for the jobs stack:

- Postgres + `pgpm-database-jobs`
- Constructive GraphQL API server
- `simple-email` function
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
   pgpm admin-users add --test --yes
   ```

3. Deploy the main app and jobs packages into DB:

   ```sh
   pgpm deploy --yes --database "$PGDATABASE" --package app-svc-local
   pgpm deploy --yes --database "$PGDATABASE" --package db-meta
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
docker compose -f docker-compose.jobs.yml up -d --build
```

This starts:

- `constructive-server` – GraphQL API server
- `simple-email` – Knative-style HTTP function
- `send-email-link` – Knative-style HTTP function
- `knative-job-service` – jobs runtime (callback server + worker + scheduler)

---

### Switching dry run vs real Mailgun sending

By default, `docker-compose.jobs.yml` runs both email functions in dry-run mode (no real email is sent), and it uses placeholder Mailgun credentials unless you provide `MAILGUN_API_KEY` / `MAILGUN_KEY`.

Quick start commands:

Dry run:

```sh
docker compose -f docker-compose.jobs.yml up -d --build --force-recreate
```

Real sending (Mailgun):

```sh
MAILGUN_API_KEY="your-mailgun-key" MAILGUN_KEY="your-mailgun-key" SIMPLE_EMAIL_DRY_RUN=false SEND_EMAIL_LINK_DRY_RUN=false docker compose -f docker-compose.jobs.yml up -d --build --force-recreate
```

To use a real Mailgun key without editing `docker-compose.jobs.yml`, set these env vars before starting the stack (or put them in a local `.env` file in the `constructive/` directory). Don't commit your `.env`.

```sh
export MAILGUN_API_KEY="your-mailgun-key"
export MAILGUN_KEY="your-mailgun-key"
```

If you're not using `mg.constructive.io`, also override `MAILGUN_DOMAIN`, `MAILGUN_FROM`, and `MAILGUN_REPLY` (for example in the override file below) to match your Mailgun setup.

To actually send email (instead of dry-run), set these env vars (or put them in your local `.env`):

```sh
export SIMPLE_EMAIL_DRY_RUN=false
export SEND_EMAIL_LINK_DRY_RUN=false
```

Then recreate the stack so the new env is applied:

```sh
docker compose -f docker-compose.jobs.yml up -d --build --force-recreate
```

If you prefer not to export env vars, create a local override file (don't commit it) at `docker-compose.jobs.override.yml`:

```yml
services:
  simple-email:
    environment:
      SIMPLE_EMAIL_DRY_RUN: "false"

  send-email-link:
    environment:
      SEND_EMAIL_LINK_DRY_RUN: "false"
```

Start the stack with both files:

```sh
docker compose -f docker-compose.jobs.yml -f docker-compose.jobs.override.yml up -d --build --force-recreate
```

To switch back to dry-run, set `SIMPLE_EMAIL_DRY_RUN=true` and `SEND_EMAIL_LINK_DRY_RUN=true` (or delete the override file) and recreate again.

---

## 5. Ensure GraphQL host routing works for `send-email-link`

Constructive selects the API by the HTTP `Host` header using rows in `meta_public.domains`.

For local development, `app-svc-local` seeds `admin.localhost` as the admin API domain. `docker-compose.jobs.yml` adds a Docker network alias so other containers can resolve `admin.localhost` to the `constructive-server` container, and `send-email-link` uses:

- `GRAPHQL_URL=http://admin.localhost:3000/graphql`

Quick check from your host (should return JSON, not HTML):

```sh
curl -s -H 'Host: admin.localhost' \
  -H 'Content-Type: application/json' \
  -X POST http://localhost:3000/graphql \
  --data '{"query":"query { __typename }"}'
```

If your GraphQL server requires auth, set `GRAPHQL_AUTH_TOKEN` before starting the jobs stack (it is passed through to the `send-email-link` container).

---

## 6. Enqueue a test job (simple-email)

With the jobs stack running, you can enqueue a test job from your host into the Postgres container:

First, grab a real `database_id` (required by `send-email-link`, optional for `simple-email`):

```sh
DBID="$(docker exec -i postgres psql -U postgres -d constructive -Atc 'SELECT id FROM collections_public.database ORDER BY created_at LIMIT 1;')"
echo "$DBID"
```

```sh
docker exec -it postgres \
  psql -U postgres -d constructive -c "
    SELECT app_jobs.add_job(
      '$DBID'::uuid,
      'simple-email',
      json_build_object(
        'to',      'user@example.com',
        'subject', 'Hello from Constructive jobs',
        'html',    '<p>Hi from simple-email (dry run)</p>'
      )::json
    );
  "
```

You should then see the job picked up by `knative-job-service` and the email payload logged by the `simple-email` container in `docker compose -f docker-compose.jobs.yml logs -f`.

---

## 7. Enqueue a test job (`send-email-link`)

`send-email-link` queries GraphQL for site/database metadata, so it requires:

- The app/meta packages deployed in step 3 (`app-svc-local`, `db-meta`)
- A real `database_id` (use `$DBID` above)
- A GraphQL hostname that matches a seeded domain route (step 5)

With `SEND_EMAIL_LINK_DRY_RUN=true` (default in `docker-compose.jobs.yml`), enqueue a job:

```sh
docker exec -it postgres \
  psql -U postgres -d constructive -c "
    SELECT app_jobs.add_job(
      '$DBID'::uuid,
      'send-email-link',
      json_build_object(
        'email_type',   'invite_email',
        'email',        'user@example.com',
        'invite_token', 'invite123',
        'sender_id',    '00000000-0000-0000-0000-000000000000'
      )::json
    );
  "
```

You should see a log like:

- `[send-email-link] DRY RUN email (skipping send) ...`

---

## 8. Inspect logs and iterate

To watch logs while you develop:

```sh
docker compose -f docker-compose.jobs.yml logs -f
```

Useful containers:

- `constructive-server`
- `simple-email`
- `knative-job-service`
- `postgres` (from `docker-compose.yml`)

If you change Docker images, environment variables, or code inside the image, restart the stack:

```sh
docker compose -f docker-compose.jobs.yml down
docker compose -f docker-compose.jobs.yml up --build
```

---

## 9. Stopping services

To stop only the jobs stack:

```sh
docker compose -f docker-compose.jobs.yml down
```

To stop everything, including Postgres and Minio:

```sh
docker compose down
```
