import type { ConstructiveError } from '@constructive-io/errors';

const escapeHtml = (value: string): string =>
  value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character] ?? character);

const page = (title: string, body: string): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(body)}</p>
    </main>
  </body>
</html>`;

export const renderOAuthFailurePage = (error: ConstructiveError): string =>
  page('External sign in failed', `${error.message} (${error.code})`);

export const renderOAuthSuccessPage = (): string =>
  page(
    'External sign in completed',
    'Authentication succeeded. You may close this page.'
  );
