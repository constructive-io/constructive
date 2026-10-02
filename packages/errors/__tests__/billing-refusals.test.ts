import { readFileSync } from 'fs';
import { join } from 'path';

import { httpStatusFor, parse, toError } from '../src';

const inventory: Record<string, unknown> = JSON.parse(
  readFileSync(join(__dirname, '../scripts/db-error-inventory.json'), 'utf-8')
);

/** The shape errors.raise_error gives node-postgres: P0001 with the payload in DETAIL. */
const raised = (code: string, context: Record<string, unknown>, errorClass: 'public' | 'internal') =>
  Object.assign(new Error(code), {
    code: 'P0001',
    detail: JSON.stringify({ code, context, class: errorClass })
  });

describe('billing refusals raised by constructive-db', () => {
  it('answers a delete blocked by a live subscription as a 409 with its context', () => {
    const context = { entity_id: '6f1c2f0e-0000-4000-8000-000000000001', external_subscription_id: 'sub_123' };
    const err = raised('BILLING_SUBSCRIPTION_ACTIVE', context, 'public');

    expect(inventory.BILLING_SUBSCRIPTION_ACTIVE).toBeDefined();
    expect(httpStatusFor(parse(err).code)).toEqual({ status: 409, mapped: true });
    expect(toError(err)).toMatchObject({
      code: 'BILLING_SUBSCRIPTION_ACTIVE',
      errorClass: 'public',
      http: 409,
      context
    });
  });

  it('answers an exhausted usage allowance as a 429', () => {
    const err = raised('BILLING_QUOTA_EXCEEDED', {}, 'public');

    expect(inventory.BILLING_QUOTA_EXCEEDED).toBeDefined();
    expect(toError(err)).toMatchObject({ errorClass: 'public', http: 429 });
  });

  it('keeps a malformed checkout binding a registered internal 500', () => {
    const err = raised('BILLING_CHECKOUT_BINDING_INVALID', { entity_id: null, operation_id: null }, 'internal');

    expect(inventory.BILLING_CHECKOUT_BINDING_INVALID).toBeDefined();
    expect(httpStatusFor('BILLING_CHECKOUT_BINDING_INVALID')).toEqual({ status: 500, mapped: true });
    expect(toError(err)).toMatchObject({ errorClass: 'internal', http: 500 });
  });
});
