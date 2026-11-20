// How one build attempt signs the owner in. A platform-identity sign-in is
// interactive: the host may show a step-up, MFA, setup or device prompt and
// mint a one-time code. A retry would show the prompt again, spend the user's
// answers, and mint a second code while the first one's refresh token is
// orphaned. A sign-in that only makes a call may be repeated.

import type { OwnerSession } from './host';
import { type RetryOptions, retryTransientOnce } from './transient';

/** The owner sign-in for one build attempt, retried only when it cannot prompt. */
export function ownerSignInAttempt(
  interactive: boolean,
  signIn: () => Promise<OwnerSession>,
  retry: RetryOptions
): Promise<OwnerSession> {
  return interactive ? signIn() : retryTransientOnce(signIn, retry);
}
