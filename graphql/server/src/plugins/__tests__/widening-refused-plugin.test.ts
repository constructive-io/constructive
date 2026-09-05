import { recordEventSql } from '../widening-refused-plugin';

describe('recordEventSql', () => {
  it('quotes the events module identifiers', () => {
    expect(recordEventSql({ privateSchemaName: 'app_events_private', recordEvent: 'record_event' })).toBe(
      'SELECT "app_events_private"."record_event"($1, $2::uuid, $3::jsonb)'
    );
  });

  it('escapes embedded quotes so identifiers cannot break out', () => {
    expect(recordEventSql({ privateSchemaName: 'x"; DROP SCHEMA y; --', recordEvent: 'f' })).toBe(
      'SELECT "x""; DROP SCHEMA y; --"."f"($1, $2::uuid, $3::jsonb)'
    );
  });
});
