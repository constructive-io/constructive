# simple-smtp-server

SMTP-based email sender for Constructive services. This package exposes a `send` helper with the same call shape used by `@launchql/postmaster` (e.g. `{ to, subject, html, text }`).

Configuration is managed through the centralized `@pgpmjs/env` system, which merges defaults, config files, environment variables, and runtime overrides.

## Install

```bash
pnpm add simple-smtp-server
```

## Usage

```ts
import { send } from 'simple-smtp-server';

await send({
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<p>Hello from SMTP</p>'
});
```

### Programmatic overrides

You can pass SMTP configuration overrides as a second argument to `send()`:

```ts
import { send } from 'simple-smtp-server';

await send(
  {
    to: 'user@example.com',
    subject: 'Welcome',
    html: '<p>Hello from SMTP</p>'
  },
  {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    user: 'myuser',
    pass: 'mypassword',
    from: 'no-reply@example.com'
  }
);
```

### Resetting the transport

If you need to reset the cached SMTP transport (e.g., in tests), use `resetTransport()`:

```ts
import { resetTransport } from 'simple-smtp-server';

resetTransport();
```

## Environment variables

Required (unless noted):

- `SMTP_HOST` (required)
- `SMTP_PORT` (optional, default: `587`)
- `SMTP_SECURE` (`true`/`false`; default: `false`, set `true` for port `465`)
- `SMTP_USER` (optional if the server allows anonymous auth)
- `SMTP_PASS` (required when `SMTP_USER` is set and auth is required)
- `SMTP_FROM` (default sender address if `from` is not passed to `send`)

Optional:

- `SMTP_REPLY_TO` (default reply-to address when not provided per message)
- `SMTP_REQUIRE_TLS` (`true`/`false`)
- `SMTP_TLS_REJECT_UNAUTHORIZED` (`true`/`false`, default: `true`)
- `SMTP_POOL` (`true`/`false`)
- `SMTP_MAX_CONNECTIONS` (number)
- `SMTP_MAX_MESSAGES` (number)
- `SMTP_NAME` (client hostname)
- `SMTP_LOGGER` (`true`/`false`, nodemailer transport logging)
- `SMTP_DEBUG` (`true`/`false`, nodemailer debug output)

## Test / debug

This package ships a small test runner you can use to validate your SMTP settings.

```bash
SMTP_HOST=smtp.example.com \
SMTP_PORT=587 \
SMTP_USER=example \
SMTP_PASS=secret \
SMTP_FROM="no-reply@example.com" \
SMTP_TEST_TO="you@example.com" \
pnpm --filter "simple-smtp-server" test:send
```

To use the built-in local SMTP catcher instead of a real SMTP server:

```bash
SMTP_TEST_USE_CATCHER=true \
pnpm --filter "simple-smtp-server" test:send
```

Optional test overrides:

- `SMTP_TEST_FROM`
- `SMTP_TEST_SUBJECT`
- `SMTP_TEST_TEXT`
- `SMTP_TEST_HTML`
- `SMTP_TEST_USE_CATCHER`
