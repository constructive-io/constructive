import assert from 'node:assert/strict';

import { BACKEND_ANSWER, FAILED_CALL, requestFailureMessage } from '../../src/pipeline/request-failure';

const URL_WITH_QUERY = 'http://api-crm.localhost/graphql?token=secret';

test('a CORS refusal names the API and says the page was not allowed', () => {
  const line = requestFailureMessage({
    url: URL_WITH_QUERY,
    errorText: 'net::ERR_FAILED',
    corsErrorStatus: { corsError: 'PreflightMissingAllowOriginHeader' },
  });
  assert.equal(
    line,
    "the browser blocked the page's call to api-crm.localhost/graphql: the API didn't allow this page's address (CORS: PreflightMissingAllowOriginHeader)",
  );
  assert.match(line, FAILED_CALL);
});

test('a call that got no answer says so, keeps the code and leaves the query out', () => {
  const line = requestFailureMessage({ url: URL_WITH_QUERY, errorText: 'net::ERR_FAILED' });
  assert.equal(
    line,
    "the page's call to api-crm.localhost/graphql ended without an answer (net::ERR_FAILED)",
  );
  assert.doesNotMatch(line, /secret/);
  // The doctor checks that the API answers from the page's address, so it is the next step here too.
  assert.match(line, FAILED_CALL);
});

test("a server error answer reads as the backend's failure, not CORS, and doesn't send the agent to app_doctor", () => {
  const line = requestFailureMessage({
    url: URL_WITH_QUERY,
    errorText: 'net::ERR_FAILED',
    corsErrorStatus: { corsError: 'MissingAllowOriginHeader' },
    status: 502,
  });
  assert.equal(
    line,
    "the API at api-crm.localhost/graphql answered HTTP 502, so the page's call failed: the backend failed, not the app",
  );
  assert.match(line, BACKEND_ANSWER);
  assert.doesNotMatch(line, FAILED_CALL);
});
