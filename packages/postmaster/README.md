# @constructive-io/postmaster

Mailgun email sender for Constructive services. This package exposes a `send` helper with the same call shape used by `simple-smtp-server` (e.g. `{ to, subject, html, text }`).

## Installation

```bash
pnpm add @constructive-io/postmaster
```

## Usage

```typescript
import { send } from '@constructive-io/postmaster';

await send({
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Hello World</p>'
});
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MAILGUN_KEY` | Mailgun API key | Yes |
| `MAILGUN_DOMAIN` | Mailgun domain (e.g., `mg.example.com`) | Yes |
| `MAILGUN_FROM` | Default sender email address | No |
| `MAILGUN_REPLY` | Default reply-to email address | No |
| `MAILGUN_DEV_EMAIL` | Development email redirect (all emails sent to this address with original recipient encoded) | No |

## Development Email Redirect

When `MAILGUN_DEV_EMAIL` is set, all emails are redirected to that address with the original recipient encoded in the local part. For example, if `MAILGUN_DEV_EMAIL=dev@example.com` and you send to `user@domain.com`, the email will be sent to `dev+user_at_domain.com@example.com`.

## API

### `send(options, mailgunOverrides?)`

Send an email via Mailgun.

**Parameters:**
- `options.to` - Recipient email address(es)
- `options.subject` - Email subject
- `options.html` - HTML body (required if no text)
- `options.text` - Plain text body (required if no html)
- `options.from` - Sender email (defaults to `MAILGUN_FROM`)
- `options.replyTo` - Reply-to address (defaults to `MAILGUN_REPLY`)
- `mailgunOverrides` - Optional overrides for Mailgun configuration

### `resetClient()`

Reset the cached Mailgun client. Useful for testing or when configuration changes.
