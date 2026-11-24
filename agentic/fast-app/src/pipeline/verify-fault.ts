// Whose fault a verify failure is, decided once, where the failure is made:
// verify's recheck and its fix read this, not the message's words.
// - `backend`: the backend failed (its handler, or a 5xx answer from its API),
//   which the app's code can't fix; verify checks again after a wait.
// - `access`: the browser couldn't reach the API (CORS, a dropped call); the
//   build's next step is app_doctor.
// - none: the app's own code.

import { BACKEND_ANSWER, FAILED_CALL } from './request-failure';
import { BACKEND_HANDLER_ERROR } from './smoke-script';
import type { VerifyFailure } from './verify';

export type VerifyFault = 'backend' | 'access';

// The API's answer itself was a server error, before any GraphQL result.
const SERVER_ERROR = /^HTTP 5\d\d\b/;

export function faultOf(
  failure: Pick<VerifyFailure, 'check' | 'message'>,
): VerifyFault | undefined {
  const { check, message } = failure;
  if (check === 'crud') {
    return BACKEND_HANDLER_ERROR.test(message) || SERVER_ERROR.test(message)
      ? 'backend'
      : undefined;
  }
  if (check === 'render') {
    if (BACKEND_ANSWER.test(message)) return 'backend';
    if (FAILED_CALL.test(message)) return 'access';
  }
  return undefined;
}

export function classified(failure: VerifyFailure): VerifyFailure {
  const fault = faultOf(failure);
  return fault ? { ...failure, fault } : failure;
}
