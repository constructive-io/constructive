# @constructive-io/simple-email-fn

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/simple-email-fn"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=functions%2Fsimple-email%2Fpackage.json"/></a>
</p>

Simple Knative-compatible email function used with the Constructive jobs system.

This function is intentionally minimal: it reads an email payload from the job
body and **logs it only** in dry‑run mode. When not in dry‑run, it sends via
the configured email provider. This is useful while wiring up jobs and Knative
without needing a real mail provider configured.

## Expected job payload

Jobs should use `task_identifier = 'simple-email'` (or whatever route you
configure at your Knative gateway) and a JSON payload like:

```json
{
  "to": "user@example.com",
  "subject": "Welcome!",
  "html": "<p>Welcome to our app</p>"
}
```

Supported fields:

- `to` (string, required)
- `subject` (string, required)
- `html` (string, optional)
- `text` (string, optional)
- `from` (string, optional)
- `replyTo` (string, optional)

At least one of `html` or `text` must be provided. If required fields are
missing, the function throws and the error is propagated via the
`@constructive-io/knative-job-fn` wrapper as a job error.

## HTTP contract (with knative-job-worker)

The function is wrapped by `@constructive-io/knative-job-fn`, so it expects:

- HTTP method: `POST`
- Body: JSON job payload (see above)
- Headers (set by `@constructive-io/knative-job-worker`):
  - `X-Worker-Id`
  - `X-Job-Id`
  - `X-Database-Id`
  - `X-Callback-Url`

The handler:

1. Reads the email data directly from the request body.
2. Logs the email metadata (to/subject/from, and whether html/text are present)
   and the full payload.
3. Responds with HTTP 200 and:

```json
{ "complete": true }
```

Errors bubble into the error middleware installed by
`@constructive-io/knative-job-fn`, so they are translated into an `X-Job-Error`
callback for the worker.

## Environment variables

Email provider configuration is only required when not running in dry‑run mode.

Optional:

- `SIMPLE_EMAIL_DRY_RUN` (`true`/`false`): log only, skip send.
- `EMAIL_SEND_USE_SMTP` (`true`/`false`): use SMTP (`simple-smtp-server`).

Mailgun (`@launchql/postmaster`) env vars when `EMAIL_SEND_USE_SMTP` is false:

- `MAILGUN_API_KEY`
- `MAILGUN_DOMAIN`
- `MAILGUN_FROM`

SMTP env vars when `EMAIL_SEND_USE_SMTP` is true:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Building locally

From the repo root:

```bash
pnpm --filter="@constructive-io/simple-email-fn" build
```

This compiles TypeScript into `dist/`.
