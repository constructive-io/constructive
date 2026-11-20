import assert from 'node:assert/strict';

import { faultOf } from '../../src/pipeline/verify-fault';

test("a 5xx from the API is the backend's fault, wherever verify met it", () => {
  // The CRUD check's call answered by a gateway while the API rebuilt.
  assert.equal(faultOf({ check: 'crud', message: 'HTTP 502: Bad Gateway' }), 'backend');
  assert.equal(
    faultOf({ check: 'crud', message: 'Failed to create handler for api-shifts' }),
    'backend',
  );
  assert.equal(
    faultOf({
      check: 'render',
      message: 'the API at api-shifts.localhost/graphql answered HTTP 500, so the call failed',
    }),
    'backend',
  );
  // A page the browser couldn't let call the API needs app_doctor.
  assert.equal(
    faultOf({
      check: 'render',
      message: "the browser blocked the page's call to api-shifts.localhost/graphql",
    }),
    'access',
  );
  // The app's own errors: a GraphQL error in the answer, a route's server error, a type error.
  assert.equal(faultOf({ check: 'crud', message: 'Field "title" is not defined' }), undefined);
  assert.equal(faultOf({ check: 'route', message: 'HTTP 500: Internal Server Error' }), undefined);
  assert.equal(faultOf({ check: 'types', message: "TS2322: Type 'x'" }), undefined);
});
