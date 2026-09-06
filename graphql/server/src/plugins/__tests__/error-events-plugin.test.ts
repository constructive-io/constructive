import { recordErrorSql } from '../error-events-plugin';

describe('recordErrorSql', () => {
  it('quotes the events module identifiers', () => {
    expect(
      recordErrorSql({
        privateSchemaName: 'app_events_private',
        recordEvent: 'record_event',
        recordError: 'record_error'
      })
    ).toBe('SELECT "app_events_private"."record_error"($1, $2::uuid, $3::jsonb)');
  });

  it('escapes embedded quotes so identifiers cannot break out', () => {
    expect(
      recordErrorSql({
        privateSchemaName: 'x"; DROP SCHEMA y; --',
        recordEvent: 'record_event',
        recordError: 'f'
      })
    ).toBe('SELECT "x""; DROP SCHEMA y; --"."f"($1, $2::uuid, $3::jsonb)');
  });

  it('throws for an events module without record_error, so the plugin logs it', () => {
    expect(() =>
      recordErrorSql({
        privateSchemaName: 'app_events_private',
        recordEvent: 'record_event',
        recordError: null
      })
    ).toThrow('app_events_private has no record_error function');
  });
});
