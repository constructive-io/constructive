import { isDatabaseUnavailableError } from '../database-availability';

const withCode = (code: string, message = `failed with ${code}`) =>
  Object.assign(new Error(message), { code });

describe('isDatabaseUnavailableError', () => {
  it.each([
    '08000', // connection_exception
    '08001', // sqlclient_unable_to_establish_sqlconnection
    '08006', // connection_failure
    '53300', // too_many_connections
    '57P01', // admin_shutdown
    '57P02', // crash_shutdown
    '57P03' // cannot_connect_now
  ])('treats SQLSTATE %s as unavailable', (code) => {
    expect(isDatabaseUnavailableError(withCode(code))).toBe(true);
  });

  it.each(['EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'EHOSTUNREACH', 'ENETUNREACH'])(
    'treats socket error %s as unavailable',
    (code) => {
      expect(isDatabaseUnavailableError(withCode(code))).toBe(true);
    }
  );

  it.each([
    'timeout exceeded when trying to connect',
    'Connection terminated unexpectedly',
    'Connection terminated due to connection timeout',
    'Client has encountered a connection error and is not queryable'
  ])('treats the node-postgres message "%s" as unavailable', (message) => {
    expect(isDatabaseUnavailableError(new Error(message))).toBe(true);
  });

  it('follows causes and aggregate members', () => {
    const refused = withCode('ECONNREFUSED');
    expect(isDatabaseUnavailableError(new Error('introspection failed', { cause: refused }))).toBe(true);
    expect(
      isDatabaseUnavailableError(new AggregateError([new Error('first address'), refused], 'connect failed'))
    ).toBe(true);
  });

  it.each([
    ['an undefined table', withCode('42P01')],
    ['a permission error', withCode('42501')],
    ['a cancelled statement', withCode('57014')],
    ['a plain error', new Error('boom')],
    ['an unknown host', withCode('ENOTFOUND')],
    ['a near-miss code', withCode('0800')]
  ])('does not treat %s as unavailable', (_label, error) => {
    expect(isDatabaseUnavailableError(error)).toBe(false);
  });

  it('ignores values that are not errors', () => {
    expect(isDatabaseUnavailableError(undefined)).toBe(false);
    expect(isDatabaseUnavailableError('ECONNREFUSED')).toBe(false);
    expect(isDatabaseUnavailableError({ code: 'ECONNREFUSED', message: 'refused' })).toBe(false);
  });

  it('stops following a cause chain that loops', () => {
    const looping = new Error('wrapper') as Error & { cause?: unknown };
    looping.cause = looping;
    expect(isDatabaseUnavailableError(looping)).toBe(false);
  });
});
