import { buildSchema, introspectionFromSchema } from 'graphql';

import { inferTablesFromIntrospection } from '../src/introspect/infer-tables';
import type { IntrospectionQueryResponse } from '../src/types/introspection';

function realtimeTag(payload = 'NoteChangedPayload', event = 'String!', row = 'Note', args = '') {
  const schema = buildSchema(`
    scalar UUID
    type Note { id: UUID!, title: String }
    type NoteConnection { nodes: [Note!]! }
    type Query { notes: NoteConnection! }
    type NoteChangedPayload { event: ${event}, note: ${row} }
    type Subscription { onNoteChanged${args}: ${payload} }
  `);
  const tables = inferTablesFromIntrospection(introspectionFromSchema(schema) as unknown as IntrospectionQueryResponse);
  expect(tables).toHaveLength(1);
  return tables[0].smartTags?.['@realtime'];
}

describe('realtime subscription inference', () => {
  it.each(['NoteChangedPayload', 'NoteChangedPayload!'])('accepts a singular payload: %s', payload => {
    expect(realtimeTag(payload)).toBe(true);
  });

  it.each(['[NoteChangedPayload]', '[NoteChangedPayload!]!', '[[NoteChangedPayload!]!]!'])('rejects a list payload: %s', payload => {
    expect(realtimeTag(payload)).toBeUndefined();
  });

  it.each(['[String]', '[String!]!'])('rejects a list event: %s', event => {
    expect(realtimeTag('NoteChangedPayload', event)).toBeUndefined();
  });

  it.each(['[Note]', '[Note!]!', '[[Note!]!]!'])('rejects a list row: %s', row => {
    expect(realtimeTag('NoteChangedPayload', 'String!', row)).toBeUndefined();
  });

  it('accepts a non-null singular row', () => {
    expect(realtimeTag('NoteChangedPayload!', 'String!', 'Note!')).toBe(true);
  });

  it.each(['(scope: String!)', '(ids: [UUID!]!)'])('rejects an unsupplied required argument: %s', args => {
    expect(realtimeTag('NoteChangedPayload', 'String!', 'Note', args)).toBeUndefined();
  });

  it.each(['(scope: String)', '(scope: String! = "default")', '(ids: [UUID!])'])('accepts optional or defaulted arguments: %s', args => {
    expect(realtimeTag('NoteChangedPayload', 'String!', 'Note', args)).toBe(true);
  });
});
