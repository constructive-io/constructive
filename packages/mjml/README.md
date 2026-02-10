# @constructive-io/mjml

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/>
  </a>
  <a href="https://www.npmjs.com/package/@constructive-io/mjml">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=packages%2Fmjml%2Fpackage.json"/>
  </a>
</p>

> MJML email HTML templates for Constructive

Generates responsive email HTML from a single `generate()` call with configurable header, message + CTA button, and footer. Peer dependencies: `react` (>=16), `react-dom` (>=16).

## Installation

```bash
npm install @constructive-io/mjml
```

## Usage

```typescript
import { generate } from '@constructive-io/mjml';

const html = generate({
  title: 'Confirm your email',
  message: 'Click the button below to confirm.',
  link: 'https://example.com/confirm?token=abc',
  linkText: 'Confirm',
  companyName: 'Acme, Inc.',
  supportEmail: 'support@acme.com',
  website: 'https://acme.com',
  logo: 'https://acme.com/logo.png'
});

// Send html with @constructive-io/postmaster or any email sender
```

## API

### `generate(options?: GenerateOptions): string`

Returns email HTML. All options are optional; defaults provide a generic template.

Options: `title`, `link`, `linkText`, `message`, `subMessage`, `bodyBgColor`, `messageBgColor`, `messageTextColor`, `messageButtonBgColor`, `messageButtonTextColor`, `companyName`, `supportEmail`, `website`, `logo`, `headerBgColor`, `headerImageProps`.

### Components

- `Header`, `Footer`, `ButtonWithMessage` — exported for custom compositions with `mjml-react`.
- Types: `GenerateOptions`, `HeaderProps`, `FooterProps`, `ButtonWithMessageProps`, `HeaderImageProps`.
