// The render check's words for a page's API call that got no usable answer.
// Chromium reports most of these as `net::ERR_FAILED`, which says nothing to
// a user: a CORS refusal, a dropped connection and a server error page look
// the same. The debugger's `Network.loadingFailed`, and the status of the
// answer when one came, tell them apart, so the line says which it was and
// which API the page called.

/** The parts of a CDP `Network.loadingFailed` event the line reads, and the answer's status. */
export type LoadingFailure = {
  url: string;
  errorText?: string;
  blockedReason?: string;
  corsErrorStatus?: { corsError?: string };
  /** The HTTP status of the answer, when the API sent one before the call failed. */
  status?: number;
};

/**
 * A server error answer: an error page carries no CORS headers, so the browser
 * reports it as a CORS refusal, but the backend failed, not the app's address.
 */
export const BACKEND_ANSWER = /^the API at \S+ answered HTTP 5\d\d\b/;

/** Matches both kinds of line below; the build's next step for either is app_doctor. */
export const FAILED_CALL =
  /^(?:the browser blocked the page's call to |the page's call to .+? ended without an answer )/;

// The API's host and path, without the query, which can carry values.
function where(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return 'the API';
  }
}

export function requestFailureMessage(failure: LoadingFailure): string {
  const target = where(failure.url);
  if (failure.status && failure.status >= 500) {
    return `the API at ${target} answered HTTP ${failure.status}, so the page's call failed: the backend failed, not the app`;
  }
  const cors = failure.corsErrorStatus?.corsError;
  if (cors) {
    return `the browser blocked the page's call to ${target}: the API didn't allow this page's address (CORS: ${cors})`;
  }
  if (failure.blockedReason) {
    return `the browser blocked the page's call to ${target} (${failure.blockedReason})`;
  }
  return `the page's call to ${target} ended without an answer (${failure.errorText || 'no error code'})`;
}
