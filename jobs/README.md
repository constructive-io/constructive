# Jobs (Knative)

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
</p>

This document describes the **current** jobs setup using:

- PostgreSQL + `pgpm-database-jobs` (`app_jobs.*`)
- `@constructive-io/knative-job-service` + `@constructive-io/knative-job-worker`
- Knative functions (deployed separately, e.g. in constructive-db)

---

## 1. Database: jobs extension

Jobs live entirely in Postgres, provided by the `pgpm-database-jobs` extension.

Key pieces:

- Schema: `app_jobs`
- Tables:
  - `app_jobs.jobs` – queued / running jobs
  - `app_jobs.scheduled_jobs` – cron-like scheduled jobs
- Functions:
  - `app_jobs.add_job(...)`
  - `app_jobs.add_scheduled_job(...)`
  - `app_jobs.get_job(...)`
  - `app_jobs.get_scheduled_job(...)`
  - `app_jobs.complete_job(...)`
  - `app_jobs.fail_job(...)`
  - `app_jobs.run_scheduled_job(...)`

Install the extension into your **app database** (the same DB your API uses). In SQL:

```sql
CREATE EXTENSION IF NOT EXISTS pgpm-database-jobs;
```

Once installed you should see:

```sql
\dt app_jobs.*
```

and at least `app_jobs.jobs` and `app_jobs.scheduled_jobs` present.

---

## 2. Knative job worker + service

The jobs runtime consists of:

- `@constructive-io/knative-job-service`
  - Starts:
    - an HTTP callback server (`@constructive-io/knative-job-server`)
    - a Knative job worker (`@constructive-io/knative-job-worker`)
    - a scheduler (`@constructive-io/job-scheduler`)
- `@constructive-io/knative-job-worker`
  - Polls `app_jobs.jobs` for work
  - For each job, `POST`s to `${KNATIVE_SERVICE_URL}/${task_identifier}`
  - Uses `X-Worker-Id`, `X-Job-Id`, `X-Database-Id`, `X-Actor-Id` headers and JSON payload

### Required env vars (knative-job-service)

From `jobs/knative-job-service/src/env.ts`:

- Postgres
  - `PGUSER` – DB user
  - `PGHOST` – DB host
  - `PGPASSWORD` – DB password
  - `PGPORT` – DB port (default `5432`)
  - `PGDATABASE` – the app DB that has `pgpm-database-jobs` installed
  - `JOBS_SCHEMA` – schema for jobs (default `app_jobs`)

- Worker configuration
  - `JOBS_SUPPORT_ANY` – `true` to accept all tasks, `false` to restrict
  - `JOBS_SUPPORTED` – comma-separated list of task names if `JOBS_SUPPORT_ANY=false`
  - `HOSTNAME` – worker/scheduler ID (used in logs and job-utils)

- Callback server
  - `INTERNAL_JOBS_CALLBACK_PORT` – port to bind the callback HTTP server (default `12345`)
  - `INTERNAL_JOBS_CALLBACK_URL` – full URL to that server, e.g.  
    `http://knative-job-service.interweb.svc.cluster.local:8080`

- Function gateway
  - `KNATIVE_SERVICE_URL` – base URL for Knative functions, e.g.  
    `http://send-email.interweb.svc.cluster.local`
  - `INTERNAL_GATEWAY_URL` – fallback used by the worker; set this equal to `KNATIVE_SERVICE_URL` to keep env validation happy

---

## 3. Cloud functions (moved to constructive-db)

The email cloud functions (e.g. `send-email`, `send-verification-link`) used to
live in this repo under `functions/`. They have been **moved to constructive-db**
and are deployed separately.

The jobs worker is agnostic to where a function runs. For each job it `POST`s the
payload to the function URL resolved from `INTERNAL_GATEWAY_DEVELOPMENT_MAP`
(task identifier -> URL) or `INTERNAL_GATEWAY_URL`. A function receives the job
payload as JSON and must return `{ complete: true }` on success, or a non-2xx
response to fail the job (the worker records the error and retries up to
`max_attempts`).

---

## 4. Local Development with Docker Compose

### Start the jobs stack

```bash
# Start postgres and minio first
docker-compose up -d

# Start the jobs services
docker-compose -f docker-compose.jobs.yml up --build
```

### Services started

| Service | Port | Description |
|---------|------|-------------|
| `constructive-admin-server` | 3001 | GraphQL API with `API_IS_PUBLIC=false` |
| `knative-job-service` | 8080 | Job worker + callback server |

The email cloud functions are deployed separately (constructive-db); point the
worker at them via `INTERNAL_GATEWAY_URL` / `INTERNAL_GATEWAY_DEVELOPMENT_MAP`.

### Test GraphQL access

```bash
# Introspect the private API
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -H "Host: private.localhost" \
  -d '{"query": "{ __schema { queryType { fields { name } } } }"}'

# List databases
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -H "Host: private.localhost" \
  -d '{"query": "{ databases { nodes { id name } } }"}'

# List users
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -H "Host: private.localhost" \
  -d '{"query": "{ users { nodes { id username displayName } } }"}'
```

---

## 5. Enqueue a job (send-verification-link)

### Get required IDs

```bash
# Get Database ID
DBID="$(docker exec -i postgres psql -U postgres -d constructive -Atc \
  'SELECT id FROM metaschema_public.database ORDER BY created_at LIMIT 1;')"
echo "Database ID: $DBID"

# Get User ID (for sender_id in invite emails)
SENDER_ID="$(docker exec -i postgres psql -U postgres -d constructive -Atc \
  'SELECT id FROM roles_public.users ORDER BY created_at LIMIT 1;')"
echo "Sender ID: $SENDER_ID"
```

### Enqueue invite_email job

```bash
# Set JWT claims so add_job can read database_id and actor_id internally
docker exec -it postgres \
  psql -U postgres -d constructive -c "
    SELECT set_config('jwt.claims.database_id', '$DBID', true);
    SELECT set_config('jwt.claims.user_id', '$SENDER_ID', true);
    SELECT app_jobs.add_job(
      'email:send_verification_link',
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

```bash
docker exec -it postgres \
  psql -U postgres -d constructive -c "
    SELECT set_config('jwt.claims.database_id', '$DBID', true);
    SELECT app_jobs.add_job(
      'email:send_verification_link',
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

```bash
docker exec -it postgres \
  psql -U postgres -d constructive -c "
    SELECT set_config('jwt.claims.database_id', '$DBID', true);
    SELECT app_jobs.add_job(
      'email:send_verification_link',
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

```bash
# Watch job service logs
docker logs -f knative-job-service
```

### Job flow

1. `app_jobs.add_job` inserts into `app_jobs.jobs` and fires `NOTIFY "jobs:insert"`
2. `knative-job-worker` receives notification, picks up the job
3. Worker `POST`s payload to the function URL (resolved from the gateway map)
4. The function processes the payload (e.g. renders and sends an email)
5. Returns `{ complete: true }` and job is marked complete

You can inspect the queue directly:

```sql
SELECT
  id,
  task_identifier,
  attempts,
  max_attempts,
  last_error,
  locked_by,
  locked_at,
  run_at,
  created_at,
  updated_at
FROM app_jobs.jobs
ORDER BY id DESC;
```

Completed jobs are removed from `app_jobs.jobs` by the completion logic; failed jobs with retries will show a `last_error` and incremented `attempts`.

---

## 5. Scheduled jobs (optional)

You can also use `app_jobs.scheduled_jobs` and `@constructive-io/job-scheduler` to run recurring jobs.

Example (generic, not specific to `send-email`):

```sql
-- database_id and actor_id are read from JWT claims automatically
SELECT app_jobs.add_scheduled_job(
  identifier := 'some-task-name',
  payload := json_build_object('foo', 'bar'),
  schedule_info := json_build_object(
    'start', NOW(),
    'end',   NOW() + '1 day'::interval,
    'rule',  '*/5 * * * *'   -- every 5 minutes (cron rule)
  )
);
```

The scheduler will:

1. Read from `app_jobs.scheduled_jobs`.
2. Use `app_jobs.run_scheduled_job` to materialize real jobs into `app_jobs.jobs`.
3. The worker then processes them like any other job.

Inspect scheduled jobs:

```sql
SELECT
  id,
  task_identifier,
  payload,
  schedule_info,
  last_scheduled,
  last_scheduled_id
FROM app_jobs.scheduled_jobs
ORDER BY id DESC;
```

---
