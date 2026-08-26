import {
  httpStatusFor,
  resetUnmappedStatusReports,
  setUnmappedStatusReporter,
  toError,
  UNMAPPED_HTTP_STATUS
} from '../src';

const reported: string[] = [];

beforeEach(() => {
  reported.length = 0;
  resetUnmappedStatusReports();
  setUnmappedStatusReporter(code => reported.push(code));
});

afterAll(() => {
  setUnmappedStatusReporter(null);
});

describe('httpStatusFor', () => {
  it('resolves registered codes from the registry', () => {
    expect(httpStatusFor('ACCOUNT_DISABLED')).toEqual({ status: 403, mapped: true });
    expect(httpStatusFor('ACCOUNT_EXISTS')).toEqual({ status: 409, mapped: true });
    expect(httpStatusFor('INVALID_CREDENTIALS')).toEqual({ status: 401, mapped: true });
    expect(httpStatusFor('DATABASE_BILLING_SUSPENDED')).toEqual({ status: 402, mapped: true });
    expect(httpStatusFor('DATABASE_ACCESS_POLICY_UNAVAILABLE')).toEqual({ status: 503, mapped: true });
    expect(reported).toEqual([]);
  });

  it('reports an unregistered code instead of silently answering 500', () => {
    expect(httpStatusFor('SSO_LINK_TICKET_ALREADY_USED_NOT_REGISTERED')).toEqual({
      status: UNMAPPED_HTTP_STATUS,
      mapped: false
    });
    expect(reported).toEqual(['SSO_LINK_TICKET_ALREADY_USED_NOT_REGISTERED']);
  });

  it('reports each unmapped code once, not once per request', () => {
    httpStatusFor('NOISY_UNREGISTERED_CODE');
    httpStatusFor('NOISY_UNREGISTERED_CODE');
    httpStatusFor('NOISY_UNREGISTERED_CODE');
    expect(reported).toEqual(['NOISY_UNREGISTERED_CODE']);
  });

  it('does not report when there is no code at all', () => {
    expect(httpStatusFor(null)).toEqual({ status: UNMAPPED_HTTP_STATUS, mapped: false });
    expect(httpStatusFor(undefined)).toEqual({ status: UNMAPPED_HTTP_STATUS, mapped: false });
    expect(reported).toEqual([]);
  });
});

describe('toError', () => {
  it('carries the registry status for a database refusal', () => {
    const pgError = Object.assign(new Error('ACCOUNT_DISABLED'), {
      code: 'P0001',
      detail: JSON.stringify({ code: 'ACCOUNT_DISABLED', context: {}, class: 'public' })
    });
    expect(toError(pgError).http).toBe(403);
    expect(reported).toEqual([]);
  });

  it('reports the unmapped code behind a 500', () => {
    const pgError = Object.assign(new Error('UNREGISTERED_REFUSAL'), {
      code: 'P0001',
      detail: JSON.stringify({ code: 'UNREGISTERED_REFUSAL', context: {}, class: 'public' })
    });
    expect(toError(pgError).http).toBe(UNMAPPED_HTTP_STATUS);
    expect(reported).toEqual(['UNREGISTERED_REFUSAL']);
  });
});
