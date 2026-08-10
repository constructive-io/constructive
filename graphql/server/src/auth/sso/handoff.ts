import { errors } from '@constructive-io/errors';

import { createOpaqueMaterial, hashOpaqueValue } from './opaque';

const HANDOFF_CODE = /^[A-Za-z0-9_-]{43}$/;
const SITE_STATE = /^[A-Za-z0-9_-]{32,128}$/;

export interface HandoffMaterial {
  code: string;
  /** PostgreSQL bytea hex input; plaintext is never passed to persistence. */
  hash: string;
}

export const createHandoffMaterial = (): HandoffMaterial => {
  const material = createOpaqueMaterial();
  return { code: material.value, hash: material.hash };
};

export const hashHandoffCode = (code: string): string => {
  if (!HANDOFF_CODE.test(code)) throw errors.INVALID_SSO_HANDOFF();
  return hashOpaqueValue(code);
};

/**
 * Add only the approved one-time callback artifacts to the exact callback
 * restored from the Tenant-owned login transaction.
 */
export const buildHandoffContinuationUrl = (
  callbackUrl: string,
  siteState: string,
  handoffCode: string
): string => {
  let callback: URL;
  try {
    callback = new URL(callbackUrl);
  } catch (cause) {
    throw errors.INTERNAL_FAILURE(
      { details: 'The database returned an invalid unified login callback.' },
      undefined,
      { cause }
    );
  }

  if (
    callback.protocol !== 'https:' ||
    callback.username ||
    callback.password ||
    callback.hash ||
    callback.searchParams.has('handoff') ||
    callback.searchParams.has('site_state')
  ) {
    throw errors.INTERNAL_FAILURE({
      details: 'The database returned an unsafe unified login callback.'
    });
  }
  if (!HANDOFF_CODE.test(handoffCode)) {
    throw errors.INTERNAL_FAILURE({ details: 'The generated SSO handoff is invalid.' });
  }
  if (!SITE_STATE.test(siteState)) {
    throw errors.INTERNAL_FAILURE({ details: 'The database returned an invalid Site state.' });
  }

  callback.searchParams.set('handoff', handoffCode);
  callback.searchParams.set('site_state', siteState);
  return callback.toString();
};
